const CACHE_NAME = 'melomus-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.webmanifest',
];

// Install: Cache offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Algunos recursos no pudieron cachearse durante la instalación:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first with Cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Helper to format discrete text for lock screens
function getDiscreteText(category) {
  switch (category) {
    case 'cuquiTime':
    case 'couple':
      return {
        title: 'MELOMUS 💕',
        body: 'Tienes un momento de conexión programado.',
      };
    case 'medications':
    case 'appointments':
      return {
        title: 'MELOMUS 🏥',
        body: 'Tienes un recordatorio de salud programado.',
      };
    case 'finance':
      return {
        title: 'MELOMUS 💰',
        body: 'Tienes un recordatorio financiero programado.',
      };
    default:
      return {
        title: 'MELOMUS 🏡',
        body: 'Tienes un recordatorio pendiente.',
      };
  }
}

// Push Event: Handle incoming push notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'MELOMUS 🏡',
    body: 'Tienes un recordatorio pendiente.',
    url: '/',
    category: undefined,
    isDiscrete: false,
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  // Enforce discrete mode on lock screen if requested or sensitive
  if (data.isDiscrete) {
    const discrete = getDiscreteText(data.category);
    data.title = discrete.title;
    data.body = discrete.body;
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [200, 100, 200],
    tag: data.tag || `melomus-push-${Date.now()}`,
    data: {
      url: data.url || '/',
      category: data.category,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click: Open or focus application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
