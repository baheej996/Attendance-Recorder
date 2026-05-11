// Samastha E-Learning Service Worker (EMERGENCY REFRESH v83)
const CACHE_NAME = 'samastha-v83';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Force network only for index.html and assets to break cache loops
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// Logic for showing notifications in the background
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || "Samastha E-Learning";
    const options = {
        body: data.body || "You have a new update from Samastha.",
        icon: "/favicon.png",
        badge: "/favicon.png",
        data: data.url || "/",
        vibrate: [100, 50, 100],
        tag: 'samastha-push',
        renotify: true
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
