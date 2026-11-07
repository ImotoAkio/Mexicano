/* Handler de Notificações Push nativas do PWA (importado pelo service worker do Workbox) */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Vila Náutica', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Vila Náutica';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'vila-nautica',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    data: { url: data.url || '/portal' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '/portal';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
            return;
          } catch (e) {
            // segue para abrir nova janela
          }
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
