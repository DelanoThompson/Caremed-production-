const CACHE = 'caremed-v8'
const SHELL = [
  '/',
  '/index.html',
  '/js/supabase.min.js',
  '/css/app.css?v=3',
  '/main.js?v=7',
  '/lib/db.js',
  '/lib/state.js',
  '/lib/utils.js',
  '/i18n/index.js',
  '/pages/App.js',
  '/pages/Dashboard.js',
  '/pages/Login.js',
  '/pages/Admin.js',
  '/pages/Builds.js',
  '/pages/Records.js',
  '/pages/Scheduler.js',
  '/pages/Settings.js',
  '/pages/Slideshow.js',
  '/pages/QCForm.js',
  '/pages/ProductBuilder.js',
  '/pages/StockRequest.js',
  '/pages/StockAdmin.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install — cache everything
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  const url = e.request.url

  // Never intercept Supabase or external requests
  if (url.includes('supabase.co') || url.includes('googleapis') || url.includes('fonts.g')) return

  // Only handle same-origin GET requests
  if (e.request.method !== 'GET' || !url.startsWith(self.location.origin)) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Serve from cache immediately, update cache in background
        fetch(e.request).then(fresh => {
          if (fresh && fresh.ok) {
            caches.open(CACHE).then(c => c.put(e.request, fresh))
          }
        }).catch(() => {})
        return cached
      }
      // Not in cache — fetch from network and cache it
      return fetch(e.request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return response
      }).catch(() => caches.match('/index.html'))
    })
  )
})
