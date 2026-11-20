// PersonaXP bildirim servis çalışanı (Firebase Cloud Messaging)
importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCUiv_m8qujg-ncp1Xob_YnjE-aFkWHQVE",
    authDomain: "personaxp-ae8ff.firebaseapp.com",
    projectId: "personaxp-ae8ff",
    storageBucket: "personaxp-ae8ff.firebasestorage.app",
    messagingSenderId: "874020769786",
    appId: "1:874020769786:web:a8d56e51623480b2bc9e43"
});

const messaging = firebase.messaging();

// Sunucu "data" mesajı gönderir; bildirimi burada gösteriyoruz
messaging.onBackgroundMessage((payload) => {
    const d = payload.data || {};
    return self.registration.showNotification(d.title || "PersonaXP", {
        body: d.body || "",
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: d.tag || "personaxp",
        data: { link: d.link || "./" }
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || "./";
    event.waitUntil((async () => {
        const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of all) { if ("focus" in c) return c.focus(); }
        return clients.openWindow(link);
    })());
});
