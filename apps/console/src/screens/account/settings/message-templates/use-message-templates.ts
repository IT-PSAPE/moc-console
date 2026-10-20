import { useCallback, useState } from 'react'
import { useWorkspace } from '@/lib/workspace-context'
import { fetchNotificationTemplates, type NotificationTemplate } from '@/data/notification-templates'
import type { MessageType } from '@moc/notifications'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useSettingsResourceLoading } from '../settings-loading-context'

const emptyTemplates: NotificationTemplate[] = []

export function useMessageTemplates() {
  const { currentWorkspaceId } = useWorkspace()
  const resource = useWorkspaceResource({ emptyValue: emptyTemplates, fetcher: fetchNotificationTemplates, resource: 'notification-templates', workspaceId: currentWorkspaceId })
  const loadResource = resource.load
  const [isRetrying, setIsRetrying] = useState(false)
  const isLoading = resource.isInitialLoading
  useSettingsResourceLoading('message-templates', isLoading)

  const retryLoad = useCallback(async () => {
    setIsRetrying(true)
    try {
      await loadResource(true)
    } finally {
      setIsRetrying(false)
    }
  }, [loadResource])
  const customised = new Set<MessageType>(resource.data.map((row) => row.messageType))

  const loadError = resource.hasData ? null : resource.error

  return { state: { isLoading, customised, hasWorkspace: currentWorkspaceId !== null, loadError, isRetrying }, actions: { retryLoad } }
}
