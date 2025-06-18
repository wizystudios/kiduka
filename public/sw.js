
const CACHE_NAME = 'kiduka-pos-v1';
const STATIC_CACHE = 'kiduka-static-v1';
const DYNAMIC_CACHE = 'kiduka-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/placeholder.svg'
];

// API endpoints that should work offline
const API_ENDPOINTS = [
  '/api/products',
  '/api/sales',
  '/api/customers'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, CACHE_NAME].includes(cacheName)) {
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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other resources
  event.respondWith(handleResourceRequest(request));
});

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache the response
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    return caches.match('/');
  }
}

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Handle offline scenarios
    if (request.method === 'GET') {
      // Return cached data for GET requests
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return empty array for list endpoints
      if (url.pathname.includes('products') || url.pathname.includes('sales')) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (request.method === 'POST' || request.method === 'PUT') {
      // Store failed requests for sync later
      await storeFailedRequest(request);
      
      return new Response(JSON.stringify({ 
        error: 'Request saved for sync when online',
        offline: true 
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return error for other methods
    return new Response(JSON.stringify({ 
      error: 'Network unavailable',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static resources
async function handleResourceRequest(request) {
  // Try cache first for static resources
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache the response
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Return fallback for images
    if (request.destination === 'image') {
      return caches.match('/placeholder.svg');
    }
    
    throw error;
  }
}

// Store failed requests for background sync
async function storeFailedRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  // Store in IndexedDB or simple cache
  const cache = await caches.open('failed-requests');
  const failedRequest = new Request(`failed-${Date.now()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(failedRequest, new Response(JSON.stringify(requestData)));
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Sync failed requests when back online
async function syncFailedRequests() {
  const cache = await caches.open('failed-requests');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await cache.match(request);
      const requestData = await response.json();
      
      // Retry the original request
      await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      // Remove from cache on success
      await cache.delete(request);
      
      console.log('Synced failed request:', requestData.url);
    } catch (error) {
      console.error('Failed to sync request:', error);
    }
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Arifa mpya kutoka KidukaPOS',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Fungua App'
      },
      {
        action: 'close',
        title: 'Funga'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('KidukaPOS', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  // Sync critical business data
  try {
    await fetch('/api/sync', { method: 'POST' });
    console.log('Content synced successfully');
  } catch (error) {
    console.error('Content sync failed:', error);
  }
}
