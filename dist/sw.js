// Unregister — service worker disabled
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => {
  caches.keys().then(k => k.forEach(key => caches.delete(key)))
  self.registration.unregister()
})
