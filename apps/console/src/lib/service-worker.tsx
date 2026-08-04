import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'

const UPDATE_INTERVAL_MS = 60_000

export function ServiceWorkerRegistrar() {
  const { dismissNotification, notify, toast } = useFeedback()

  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined
    let intervalId: number | undefined
    let updateNotificationId: string | null = null

    function checkForUpdate() {
      registration?.update().catch(() => undefined)
    }

    const updateServiceWorker = registerSW({
      onNeedRefresh() {
        if (updateNotificationId) return
        updateNotificationId = notify({
          title: 'Update ready',
          description: 'Reload MOC Console to apply the latest version.',
          dismissible: false,
          action: {
            label: 'Reload now',
            onClick() {
              void updateServiceWorker(true)
            },
          },
        })
      },
      onRegisteredSW(_swUrl, registeredServiceWorker) {
        if (!registeredServiceWorker) return
        registration = registeredServiceWorker
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS)
        window.addEventListener('online', checkForUpdate)
      },
      onRegisterError() {
        toast({ title: 'App updates unavailable', description: 'Reconnect and reload to restore automatic updates.', variant: 'warning' })
      },
    })

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') checkForUpdate()
    }

    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId)
      window.removeEventListener('online', checkForUpdate)
      document.removeEventListener('visibilitychange', checkWhenVisible)
      if (updateNotificationId) dismissNotification(updateNotificationId)
    }
  }, [dismissNotification, notify, toast])

  return null
}
