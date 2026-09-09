import { useEffect } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'

export function ConnectivityMonitor() {
  const { dismissNotification, notify, toast } = useFeedback()

  useEffect(() => {
    let offlineNotificationId: string | null = null

    function showOfflineStatus() {
      if (offlineNotificationId) return
      offlineNotificationId = notify({
        title: 'You’re offline',
        description: 'Live data and changes are unavailable until the connection returns.',
        variant: 'warning',
        dismissible: false,
      })
    }

    function showOnlineStatus() {
      if (!offlineNotificationId) return
      dismissNotification(offlineNotificationId)
      offlineNotificationId = null
      toast({ title: 'Back online', variant: 'success' })
    }

    if (!navigator.onLine) showOfflineStatus()
    window.addEventListener('offline', showOfflineStatus)
    window.addEventListener('online', showOnlineStatus)

    return () => {
      window.removeEventListener('offline', showOfflineStatus)
      window.removeEventListener('online', showOnlineStatus)
      if (offlineNotificationId) dismissNotification(offlineNotificationId)
    }
  }, [dismissNotification, notify, toast])

  return null
}
