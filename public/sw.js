const CACHE_NAME = 'budget-app-v2'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  // Always network-first for HTML so new deployments are picked up immediately
  const url = new URL(event.request.url)
  const isHtml = event.request.headers.get('accept')?.includes('text/html') || url.pathname === '/' || url.pathname.endsWith('.html')
  if (isHtml) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache)
        })
        return response
      })
    }).catch(() => {
      return caches.match('/')
    })
  )
})
