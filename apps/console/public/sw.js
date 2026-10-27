// Push-only service worker. Keep this file at /sw.js so installed clients can
// update the previous Workbox worker without replacing its registration.
globalThis.addEventListener('install', () => {
  void globalThis.skipWaiting()
})

globalThis.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await globalThis.caches.keys()
    const legacyWorkboxCaches = cacheNames.filter((cacheName) => cacheName.startsWith('workbox-'))
    await Promise.all(legacyWorkboxCaches.map((cacheName) => globalThis.caches.delete(cacheName)))
    await globalThis.clients.claim()
  })())
})

function readPayload(event) {
  if (!event.data) return {}
  try {
    const payload = event.data.json()
    return payload && typeof payload === 'object' ? payload : {}
  } catch {
    return {}
  }
}

function readText(value, fallback, limit = 180) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : fallback
}

function sameOriginTarget(value) {
  try {
    const target = new URL(typeof value === 'string' ? value : '/', globalThis.location.origin)
    if (target.origin !== globalThis.location.origin || target.protocol !== globalThis.location.protocol) {
      return new URL('/', globalThis.location.origin).href
    }
    return target.href
  } catch {
    return new URL('/', globalThis.location.origin).href
  }
}

globalThis.addEventListener('push', (event) => {
  const payload = readPayload(event)
  const title = readText(payload.title, 'MOC Console')
  const tag = readText(payload.tag, '', 120)
  const options = {
    body: readText(payload.body, '', 500),
    icon: '/icons/icon-192.png',
    data: { url: sameOriginTarget(payload.url) },
    ...(tag ? { tag } : {}),
  }
  event.waitUntil(globalThis.registration.showNotification(title, options))
})

globalThis.addEventListener('notificationclick', (event) => {
  const target = sameOriginTarget(event.notification.data?.url)
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await globalThis.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    for (const client of windows) {
      if (new URL(client.url).origin !== globalThis.location.origin) continue
      await client.focus()
      await client.navigate(target)
      return
    }
    await globalThis.clients.openWindow(target)
  })())
})
