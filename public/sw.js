// Service worker ترباوية: تثبيت التطبيق (PWA) + استقبال إشعارات Push
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// مطلوب وجود fetch handler عشان Chrome يعتبر الموقع قابل للتثبيت
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// استقبال إشعار push من السيرفر وعرضه
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'ترباوية', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'ترباوية';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// الضغط على الإشعار يفتح الصفحة المناسبة (أو يركز عليها لو مفتوحة)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
