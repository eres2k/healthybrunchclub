// Service Worker for Healthy Brunch Club
// Version 1.0.0

const CACHE_NAME = 'healthy-brunch-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  // Add critical CSS and JS files
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  // Icons
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Resources to cache on first request
const RUNTIME_CACHE_URLS = [
  // Videos
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  // Add other runtime resources
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static resources...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache static resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and non-HTTP(S) schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If we got a valid response, clone and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // If not in cache, serve offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle image requests with network-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Cache successful image responses
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          // Try to serve the last cached version if available
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // Return a fallback image for offline scenarios
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#F3E8DA" width="200" height="150"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#A9AB88" font-family="Inter, sans-serif" font-size="14">Image offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        })
    );
    return;
  }

  // Handle font requests with cache-first strategy
  if (request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          return response || fetch(request)
            .then(networkResponse => {
              if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return networkResponse;
            });
        })
    );
    return;
  }

  // Handle video requests with network-first strategy (due to size)
  if (request.url.includes('commondatastorage.googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache smaller video chunks
          if (response.status === 206 || response.headers.get('content-length') < 10000000) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses for short time
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              if (response) {
                // Add header to indicate cached response
                const newHeaders = new Headers(response.headers);
                newHeaders.append('X-Served-By', 'ServiceWorker');
                return new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: newHeaders
                });
              }
              // Return offline response for API calls
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'This feature requires an internet connection' 
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Default strategy: Network first, then cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-form') {
    event.waitUntil(syncFormData());
  }
});

// Function to sync form data when online
async function syncFormData() {
  try {
    const db = await openDB();
    const tx = db.transaction(['forms'], 'readonly');
    const store = tx.objectStore('forms');
    const forms = await store.getAll();
    
    for (const form of forms) {
      try {
        const response = await fetch('/api/submit-form', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form.data)
        });
        
        if (response.ok) {
          // Remove successfully synced form
          const deleteTx = db.transaction(['forms'], 'readwrite');
          const deleteStore = deleteTx.objectStore('forms');
          await deleteStore.delete(form.id);
        }
      } catch (error) {
        console.error('Failed to sync form:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  const options = {
    body: 'Neue Angebote und Events im Healthy Brunch Club!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'healthy-brunch-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'Anzeigen',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Schließen',
        icon: '/icons/dismiss-action.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data.url = data.url || options.data.url;
    } catch (error) {
      console.error('Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Healthy Brunch Club', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    const url = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Simple IndexedDB wrapper for offline form storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthyBrunchDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('forms')) {
        const store = db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  try {
    // Update menu data, opening hours, etc.
    const response = await fetch('/api/content-update');
    if (response.ok) {
      const data = await response.json();
      
      // Cache updated content
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/content-update', new Response(JSON.stringify(data)));
      
      console.log('Content updated successfully');
    }
  } catch (error) {
    console.error('Failed to update content:', error);
  }
}

// Message handling from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker loaded successfully');