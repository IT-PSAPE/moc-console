import { useCallback, useMemo, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE, type DateFormatPreset, DATE_FORMAT_OPTIONS, formatInstant } from '@moc/notifications'
import { fetchNotificationSettings, updateMessageFormat } from '@/data/notification-settings'
import type { NotificationSettings } from '@/data/notification-settings'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useSettingsResourceLoading } from './settings-loading-context'

const COMMON_TIMEZONES = ['Africa/Harare', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']
const EXAMPLE_INSTANT = '2026-05-21T17:00:00Z'

export function useMessageFormat() {
  const { toast } = useFeedback()
  const { currentWorkspaceId } = useWorkspace()
  const resource = useWorkspaceResource<NotificationSettings | null>({ emptyValue: null, fetcher: fetchNotificationSettings, resource: 'notification-settings', workspaceId: currentWorkspaceId })
  const [draft, setDraft] = useState<{ workspaceId: string; timezone: string; dateFormat: DateFormatPreset } | null>(null)
  const timezone = draft?.workspaceId === currentWorkspaceId ? draft.timezone : resource.data?.timezone ?? DEFAULT_TIMEZONE
  const dateFormat = draft?.workspaceId === currentWorkspaceId ? draft.dateFormat : resource.data?.dateFormat ?? DEFAULT_DATE_FORMAT
  const loadResource = resource.load
  const updateResource = resource.updateData
  useSettingsResourceLoading('date-time-settings', resource.isInitialLoading)

  const save = useCallback(async (nextTimezone: string, nextFormat: DateFormatPreset) => {
    if (!currentWorkspaceId) return
    try {
      await updateMessageFormat(currentWorkspaceId, nextTimezone, nextFormat)
      updateResource((current) => current ? { ...current, timezone: nextTimezone, dateFormat: nextFormat } : current)
      toast({ title: 'Message format updated', variant: 'success' })
    } catch (error) {
      setDraft(null)
      toast({ title: "Couldn't update format", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
      await loadResource(true)
    }
  }, [currentWorkspaceId, loadResource, updateResource, toast])

  const changeTimezone = useCallback((next: string | null) => {
    if (next === null) return
    setDraft({ workspaceId: currentWorkspaceId ?? '', timezone: next, dateFormat })
    void save(next, dateFormat)
  }, [currentWorkspaceId, dateFormat, save])

  const changeDateFormat = useCallback((next: DateFormatPreset | null) => {
    if (next === null) return
    setDraft({ workspaceId: currentWorkspaceId ?? '', timezone, dateFormat: next })
    void save(timezone, next)
  }, [currentWorkspaceId, save, timezone])
  const retryLoad = useCallback(() => loadResource(true), [loadResource])

  const timezoneItems = useMemo(() => (COMMON_TIMEZONES.includes(timezone) ? COMMON_TIMEZONES : [timezone, ...COMMON_TIMEZONES]).map(value => ({ label: value, value })), [timezone])
  const dateFormatItems = useMemo(() => DATE_FORMAT_OPTIONS.map(option => ({ label: formatInstant(EXAMPLE_INSTANT, timezone, option.value), value: option.value })), [timezone])

  return { state: { timezone, dateFormat, isLoading: resource.isLoading, loadError: resource.error, timezoneItems, dateFormatItems }, actions: { changeTimezone, changeDateFormat, retryLoad } }
}
