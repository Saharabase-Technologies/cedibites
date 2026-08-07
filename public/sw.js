// CediBites Push Notification Service Worker
// This file MUST live at /sw.js (public root) for push scope to work.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'CediBites',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'CediBites';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/cblogo.webp',
    badge: payload.badge || '/cblogo.webp',
    tag: payload.tag || 'cedibites-notification',
    data: payload.data || {},
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/admin/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if one is open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICK',
            data: data,
          });
          return;
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
