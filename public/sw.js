/* Service Worker for PWA installability + Web Push */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first by default; no custom fetch handling to keep logic simple
self.addEventListener('fetch', () => {});

// Receive push and show notification
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'お知らせ';
    const body = data.body || '';
    const url = data.url || '/announcements';
    const tag = data.tag || 'announcement';
    const icon = data.icon || '/icons/icon-192x192.png';
    const badge = data.badge || '/icons/icon-192x192.png';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        renotify: true,
        data: { url },
      })
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('お知らせ', {
        body: '新しい通知があります',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'announcement',
        renotify: true,
        data: { url: '/announcements' },
      })
    );
  }
});

// Focus or open when notification clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/announcements';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            // @ts-ignore
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
