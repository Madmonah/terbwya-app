// Service worker بسيط لتفعيل خاصية تثبيت التطبيق (PWA) — بدون تخزين مؤقت عدواني
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// مطلوب وجود فetch handler عشان Chrome يعتبر الموقع قابل للتثبيت
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
