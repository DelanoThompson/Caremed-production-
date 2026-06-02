const CACHE = 'caremed-v9'

self.addEventListener('install', e => {
  // Cache only the essentials — don't block on everything
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/index.html',
      '/js/supabase.min.js',
      '/css/app.css',
      '/icons/icon-192.png',
    ])).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = e.request.url
  if (e.request.method !== 'GET') return
  if (url.includes('supabase.co') || url.includes('googleapis')) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        }
        return res
      }).catch(() => cached || new Response('Offline', { status: 503 }))
      // Return cached immediately if available, fetch in background
      return cached || network
    })
  )
})
