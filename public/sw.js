
const CACHE_NAME = 'kiduka-pos-v2';
const STATIC_CACHE = 'kiduka-static-v2';
const DYNAMIC_CACHE = 'kiduka-dynamic-v2';
const IMAGES_CACHE = 'kiduka-images-v2';

// Enhanced static assets to cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/placeholder.svg',
  // Add offline page
  '/offline.html'
];

// Critical API endpoints for offline functionality
const CRITICAL_APIS = [
  '/api/products',
  '/api/sales',
  '/api/customers',
  '/api/profile'
];

// Install event - cache static assets and offline page
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Create offline page
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.put('/offline.html', new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>KidukaPOS - Offline</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 20px; background: #f5f5f5; text-align: center;
              }
              .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 10px; }
              p { color: #666; margin-bottom: 20px; }
              .button { 
                background: #7c3aed; color: white; padding: 12px 24px; 
                border: none; border-radius: 6px; cursor: pointer; font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📱</div>
              <h1>KidukaPOS</h1>
              <p>Hakuna muunganisho wa mtandao. Baadhi ya vipengele vinaweza kutumika bila mtandao.</p>
              <button class="button" onclick="window.location.reload()">Jaribu Tena</button>
            </div>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        }));
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGES_CACHE, CACHE_NAME];
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Enhanced fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle images
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other resources (CSS, JS, etc.)
  event.respondWith(handleResourceRequest(request));
});

// Enhanced navigation request handler
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request, { timeout: 3000 });
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for navigation, trying cache...');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try to match any cached page for SPA fallback
    const mainPage = await caches.match('/');
    if (mainPage) {
      return mainPage;
    }
    
    // Final fallback to offline page
    return caches.match('/offline.html');
  }
}

// Enhanced API request handler with better offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCriticalEndpoint = CRITICAL_APIS.some(endpoint => url.pathname.includes(endpoint));
  
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request, { timeout: 5000 });
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Cache with timestamp for freshness checks
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const responseWithTimestamp = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, responseWithTimestamp);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request:', url.pathname);
    
    // Handle offline scenarios
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        // Check cache freshness (24 hours for critical data)
        const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
        const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');
        const maxAge = isCriticalEndpoint ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 24h vs 7 days
        
        if (cacheAge < maxAge) {
          // Add offline indicator header
          const headers = new Headers(cachedResponse.headers);
          headers.set('x-served-by', 'sw-cache');
          headers.set('x-cache-age', Math.floor(cacheAge / 1000 / 60).toString() + ' minutes');
          
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: headers
          });
        }
      }
      
      // Return empty array for list endpoints when no cache available
      if (url.pathname.includes('/products') || url.pathname.includes('/sales')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'x-served-by': 'sw-fallback'
          }
        });
      }
    }
    
    // Handle POST/PUT requests when offline
    if (request.method === 'POST' || request.method === 'PUT') {
      await storeFailedRequest(request);
      
      return new Response(JSON.stringify({ 
        error: 'Request queued for sync when online',
        offline: true,
        queued: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return meaningful error for other requests
    return new Response(JSON.stringify({ 
      error: 'Service unavailable - please check your connection',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Enhanced image request handler
async function handleImageRequest(request) {
  try {
    // Try cache first for images
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try network
    const networkResponse = await fetch(request, { timeout: 3000 });
    
    if (networkResponse.ok) {
      // Cache images in separate cache
      const cache = await caches.open(IMAGES_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder image for failed requests
    return caches.match('/placeholder.svg') || new Response('', { status: 404 });
  }
}

// Enhanced resource request handler
async function handleResourceRequest(request) {
  try {
    // Try cache first for static resources
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network with timeout
    const networkResponse = await fetch(request, { timeout: 3000 });
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Resource request failed:', request.url);
    throw error;
  }
}

// Enhanced failed request storage
async function storeFailedRequest(request) {
  try {
    const requestData = {
      id: generateRequestId(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now(),
      retryCount: 0
    };
    
    const cache = await caches.open('failed-requests');
    const failedRequest = new Request(`failed-${requestData.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(failedRequest, new Response(JSON.stringify(requestData)));
    console.log('Stored failed request for later sync:', requestData.url);
  } catch (error) {
    console.error('Failed to store request:', error);
  }
}

// Generate unique request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Enhanced background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Enhanced sync failed requests
async function syncFailedRequests() {
  try {
    const cache = await caches.open('failed-requests');
    const requests = await cache.keys();
    
    let syncedCount = 0;
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const requestData = await response.json();
        
        // Skip if too many retries
        if (requestData.retryCount >= 3) {
          await cache.delete(request);
          continue;
        }
        
        // Retry the original request
        const retryResponse = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (retryResponse.ok) {
          await cache.delete(request);
          syncedCount++;
          console.log('Successfully synced request:', requestData.url);
        } else {
          // Increment retry count
          requestData.retryCount++;
          await cache.put(request, new Response(JSON.stringify(requestData)));
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
        
        // Increment retry count for failed sync attempts
        try {
          const response = await cache.match(request);
          const requestData = await response.json();
          requestData.retryCount++;
          await cache.put(request, new Response(JSON.stringify(requestData)));
        } catch (updateError) {
          console.error('Failed to update retry count:', updateError);
        }
      }
    }
    
    if (syncedCount > 0) {
      // Notify clients about successful sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          syncedCount: syncedCount
        });
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Enhanced push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'KidukaPOS',
    body: 'Arifa mpya kutoka KidukaPOS',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    tag: 'default',
    data: { url: '/' }
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Failed to parse push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: 'Fungua',
        icon: '/placeholder.svg'
      },
      {
        action: 'dismiss',
        title: 'Funga'
      }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Open new window if app is not open
        return clients.openWindow(urlToOpen);
      })
  );
});

// Enhanced message handling
self.addEventListener('message', (event) => {
  console.log('Service Worker message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Periodic background sync for data freshness
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(performPeriodicSync());
  }
});

async function performPeriodicSync() {
  try {
    console.log('Performing periodic sync...');
    
    // Sync critical data
    await Promise.all([
      fetch('/api/products'),
      fetch('/api/sales/recent'),
      fetch('/api/profile')
    ]);
    
    console.log('Periodic sync completed');
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

console.log('Enhanced Service Worker loaded successfully');
