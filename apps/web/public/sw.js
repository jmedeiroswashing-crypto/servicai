self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'ServiçAi', {
      body: data.body || '',
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      data: { link: data.link || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
