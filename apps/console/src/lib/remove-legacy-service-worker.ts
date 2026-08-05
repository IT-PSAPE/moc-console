const RETIREMENT_RELOAD_KEY = 'moc-console-service-worker-retired'

async function deleteBrowserCaches(): Promise<void> {
  if (!('caches' in globalThis)) return

  const cacheNames = await globalThis.caches.keys()
  await Promise.all(cacheNames.map((cacheName) => globalThis.caches.delete(cacheName)))
}

export async function removeLegacyServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const wasControlled = navigator.serviceWorker.controller !== null
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(registrations.map((registration) => registration.unregister()))
  await deleteBrowserCaches()

  if (wasControlled && sessionStorage.getItem(RETIREMENT_RELOAD_KEY) !== 'true') {
    sessionStorage.setItem(RETIREMENT_RELOAD_KEY, 'true')
    window.location.reload()
  }
}
