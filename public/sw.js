// Service Worker para manejar notificaciones Push
self.addEventListener('push', function(event) {
  if (event.data) {
    const payload = event.data.json();
    
    const options = {
      body: payload.body || 'Tienes una nueva notificación de Resico Fácilto',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data || {},
      actions: [
        { action: 'open', title: 'Ver ahora' },
        { action: 'close', title: 'Cerrar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || 'Resico Fácilto', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Abrir la app en el dashboard
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
