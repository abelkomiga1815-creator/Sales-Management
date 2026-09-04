// Shop Ledger Service Worker
// Handles offline caching for static assets and the app shell

const CACHE_NAME = 'shop-ledger-v2';
const STATIC_ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/manifest.json',
    '/static/images/icon-192x192.png',
    '/static/images/icon-512x512.png',
    '/static/images/maskable-icon-512x512.png',
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS)
                    .catch(error => {
                        console.warn('[Service Worker] Some assets failed to cache:', error);
                        // Continue even if some assets fail to cache
                        return Promise.resolve();
                    });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip API calls (let them go through the network)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Return offline response for failed API calls
                    return new Response(
                        JSON.stringify({
                            error: 'Offline - API requests require internet connection'
                        }),
                        {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'application/json'
                            })
                        }
                    );
                })
        );
        return;
    }
    
    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[Service Worker] Serving from cache:', request.url);
                    return cachedResponse;
                }
                
                return fetch(request)
                    .then((response) => {
                        // Clone the response
                        const clonedResponse = response.clone();
                        
                        // Cache successful responses
                        if (response.status === 200 && response.type === 'basic') {
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, clonedResponse);
                                })
                                .catch(error => {
                                    console.warn('[Service Worker] Cache put failed:', error);
                                });
                        }
                        
                        return response;
                    })
                    .catch((error) => {
                        console.warn('[Service Worker] Fetch failed:', error);
                        
                        // Return offline page for HTML requests
                        if (request.mode === 'navigate') {
                            return caches.match('/');
                        }
                        
                        // Return error response for other requests
                        return new Response('Offline - Resource not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle background sync (optional - for future features)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    
    if (event.tag === 'sync-transactions') {
        event.waitUntil(
            // Sync transactions when connection is restored
            Promise.resolve()
        );
    }
});

// Handle push notifications (optional - for future features)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const options = {
        body: event.data.text(),
        icon: '/static/images/icon-192x192.png',
        badge: '/static/images/icon-192x192.png',
    };
    
    event.waitUntil(
        self.registration.showNotification('Shop Ledger', options)
    );
});

// Log service worker status
console.log('[Service Worker] Service Worker script loaded');
