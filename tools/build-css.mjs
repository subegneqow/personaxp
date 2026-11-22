// Tailwind'i önceden derler: index.html'deki sınıflardan tw.css üretir (sayfa açılışında derleme yapılmaz).
// Kullanım: node tools/build-css.mjs   (index.html her değiştiğinde yeniden çalıştır)
import { compile } from '/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs';
import fs from 'fs'; import path from 'path'; import crypto from 'crypto';
const base = '/opt/npm-tools/node_modules/tailwindcss';
const root = path.dirname(new URL(import.meta.url).pathname) + '/..';
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const c = await compile('@import "tailwindcss";', { base, loadStylesheet: async (id, b) => { const f = id === 'tailwindcss' ? path.join(base, 'index.css') : path.resolve(b, id); return { path: f, base: path.dirname(f), content: fs.readFileSync(f, 'utf8') }; } });
const cands = new Set(html.match(/[^\s"'`<>=]+/g));
// Tailwind v3 (eski CDN) ile aynı görünsün diye küçük uyumluluk katmanı
const compat = `
@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button { border-color: #e5e7eb; }
  input::placeholder, textarea::placeholder { color: #9ca3af; opacity: 1; }
  button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer; }
}
.rounded-sm { border-radius: 0.125rem; }
`;
const css = c.build([...cands]) + compat;
fs.writeFileSync(path.join(root, 'tw.css'), css);
const v = crypto.createHash('md5').update(css).digest('hex').slice(0, 8);
html = html.replace(/<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>/, `<link rel="stylesheet" href="tw.css?v=${v}">`)
           .replace(/<link rel="stylesheet" href="tw\.css\?v=[0-9a-f]+">/, `<link rel="stylesheet" href="tw.css?v=${v}">`);
fs.writeFileSync(htmlPath, html);
console.log(`tw.css ${Math.round(css.length / 1024)} KB, v=${v}`);
