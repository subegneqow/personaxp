// PersonaXP hatırlatma göndericisi — GitHub Actions'ta her 15 dakikada bir çalışır.
// Her kullanıcının ayarladığı saatte, o gün YAPILMAMIŞ rutinler varsa telefonuna bildirim gönderir.
import admin from "firebase-admin";

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
if (!sa.project_id) { console.error("FIREBASE_SERVICE_ACCOUNT secret eksik"); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const fcm = admin.messaging();

const WINDOW_MIN = 180; // GitHub zamanlayıcısı gecikebilir: saatten sonraki 3 saat içinde bir kez gönder
const DRY = process.env.DRY_RUN === "1";

function localParts(tz) {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
    const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, min: (parseInt(p.hour) % 24) * 60 + parseInt(p.minute) };
}

function buildMessage(st, today) {
    const routines = (st.routines || []).filter(r => r.lastCompletedDate !== today);
    const streak = st.streak || {};
    const streakDone = streak.lastActiveDate === today && streak.dailyCompleted;
    if (!routines.length && streakDone) return null; // her şey tamam, rahatsız etme
    const name = st.customName || "Alp";
    if (routines.length) {
        const list = routines.slice(0, 3).map(r => r.text).join(", ") + (routines.length > 3 ? ` +${routines.length - 3}` : "");
        const title = !streakDone && (streak.current || 0) > 0 ? `🔥 ${streak.current} günlük serin tehlikede!` : `⏰ ${name}, rutin zamanı`;
        return { title, body: `Bugün ${routines.length} rutinin kaldı: ${list}` };
    }
    return { title: `🔥 Serini koru, ${name}!`, body: "Bugün henüz hiçbir şey kaydetmedin. Küçük bir adım yeter." };
}

const snap = await db.collectionGroup("profile").get();
let sent = 0;
for (const doc of snap.docs) {
    if (doc.id !== "userData") continue;
    const st = doc.data();
    const rem = st.reminders || {};
    const tokens = (rem.tokens || []).filter(Boolean);
    if (!rem.enabled || !tokens.length || !(rem.times || []).length) continue;
    const tz = rem.tz || "Europe/Istanbul";
    const now = localParts(tz);
    const stateRef = doc.ref.parent.doc("reminderState"); // ayrı belge: istemci userData'yı üzerine yazsa da kaybolmaz
    const state = (await stateRef.get()).data() || {};
    const lastSent = state.lastSent || {};
    for (const t of rem.times) {
        const [h, m] = String(t).split(":").map(Number);
        const tMin = h * 60 + (m || 0);
        const key = t;
        if (now.min < tMin || now.min >= tMin + WINDOW_MIN || lastSent[key] === now.date) continue;
        const msg = buildMessage(st, now.date);
        lastSent[key] = now.date;
        if (!msg) { console.log(`${doc.ref.path} ${t}: her şey tamam, gönderilmedi`); continue; }
        console.log(`${doc.ref.path} ${t}: ${msg.title} — ${msg.body}`);
        if (!DRY) {
            const res = await fcm.sendEachForMulticast({
                tokens,
                data: { title: msg.title, body: msg.body, tag: `personaxp-${key}`, link: "https://subegneqow.github.io/personaxp/" },
                webpush: { headers: { Urgency: "high", TTL: "3600" } }
            });
            sent += res.successCount;
            res.responses.forEach((r, i) => { if (!r.success) console.warn("token hatası:", tokens[i].slice(0, 12), r.error?.code); });
        }
    }
    if (!DRY) await stateRef.set({ lastSent }, { merge: true });
}
console.log(`Bitti. Gönderilen bildirim: ${sent}`);
