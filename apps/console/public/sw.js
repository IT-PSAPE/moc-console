// Retires the previous Workbox service worker and clears every cache it owned.
// Keep this file at /sw.js so installed clients receive it as an update.
globalThis.addEventListener('install', () => {
  void globalThis.skipWaiting()
})

globalThis.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await globalThis.registration.unregister()

    const cacheNames = await globalThis.caches.keys()
    await Promise.all(cacheNames.map((cacheName) => globalThis.caches.delete(cacheName)))

    const clients = await globalThis.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    await Promise.all(clients.map((client) => 'navigate' in client ? client.navigate(client.url) : undefined))
  })())
})
