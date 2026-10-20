import { useCallback, useState, type ChangeEvent } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS, DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS, fetchNotificationSettings, updateAutoArchiveDays } from '@/data/notification-settings'
import type { NotificationSettings } from '@/data/notification-settings'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useSettingsResourceLoading } from './settings-loading-context'

function parsePositiveInteger(value: string): number | null {
  const days = Number.parseInt(value, 10)
  return Number.isInteger(days) && days > 0 ? days : null
}

export function useArchiveAutomations() {
  const { toast } = useFeedback()
  const { currentWorkspaceId } = useWorkspace()
  const resource = useWorkspaceResource<NotificationSettings | null>({ emptyValue: null, fetcher: fetchNotificationSettings, resource: 'notification-settings', workspaceId: currentWorkspaceId })
  const savedRequestDays = resource.data?.autoArchiveCompletedRequestsDays ?? DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS
  const savedBookingDays = resource.data?.autoArchiveReturnedBookingsDays ?? DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS
  const [draft, setDraft] = useState<{ workspaceId: string; requestDaysInput: string; bookingDaysInput: string } | null>(null)
  const requestDaysInput = draft?.workspaceId === currentWorkspaceId ? draft.requestDaysInput : String(savedRequestDays)
  const bookingDaysInput = draft?.workspaceId === currentWorkspaceId ? draft.bookingDaysInput : String(savedBookingDays)
  const updateResource = resource.updateData
  const loadResource = resource.load
  useSettingsResourceLoading('archive-settings', resource.isInitialLoading)

  const save = useCallback(async (nextRequestDays: number, nextBookingDays: number) => {
    if (!currentWorkspaceId) return
    try {
      await updateAutoArchiveDays(currentWorkspaceId, nextRequestDays, nextBookingDays)
      updateResource((current) => current ? { ...current, autoArchiveCompletedRequestsDays: nextRequestDays, autoArchiveReturnedBookingsDays: nextBookingDays } : current)
      toast({ title: 'Archive automations updated', variant: 'success' })
    } catch (error) {
      setDraft({ workspaceId: currentWorkspaceId, requestDaysInput: String(savedRequestDays), bookingDaysInput: String(savedBookingDays) })
      toast({ title: "Couldn't update archive automations", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    }
  }, [currentWorkspaceId, savedBookingDays, savedRequestDays, toast, updateResource])

  function changeRequestDays(event: ChangeEvent<HTMLInputElement>) {
    setDraft({ workspaceId: currentWorkspaceId ?? '', requestDaysInput: event.target.value, bookingDaysInput })
  }
  function changeBookingDays(event: ChangeEvent<HTMLInputElement>) {
    setDraft({ workspaceId: currentWorkspaceId ?? '', requestDaysInput, bookingDaysInput: event.target.value })
  }
  async function saveRequestDays() {
    const days = parsePositiveInteger(requestDaysInput)
    if (days === null) return setDraft({ workspaceId: currentWorkspaceId ?? '', requestDaysInput: String(savedRequestDays), bookingDaysInput })
    if (days !== savedRequestDays) await save(days, savedBookingDays)
  }
  async function saveBookingDays() {
    const days = parsePositiveInteger(bookingDaysInput)
    if (days === null) return setDraft({ workspaceId: currentWorkspaceId ?? '', requestDaysInput, bookingDaysInput: String(savedBookingDays) })
    if (days !== savedBookingDays) await save(savedRequestDays, days)
  }
  const retryLoad = useCallback(() => loadResource(true), [loadResource])

  return { state: { requestDaysInput, bookingDaysInput, isLoading: resource.isLoading, loadError: resource.error }, actions: { changeRequestDays, changeBookingDays, saveRequestDays, saveBookingDays, retryLoad } }
}
