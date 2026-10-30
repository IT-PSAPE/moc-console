import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { OverviewItemKind, UserPreferences } from '@moc/sdk/users'
import { fetchUserPreferences, saveUserPreferences } from '@/data/user-preferences'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useAuth } from '@/lib/auth-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { defaultOverviewItemKinds, equalOverviewItemKinds, normalizeOverviewItemKinds, overviewItemOptions } from './overview-item-options'
import { calendarViewOptions } from './calendar-view-options'
import { consoleQueryPolicy } from '@/lib/console-query-policy'

export function useUserPreferencesState() {
  const { user } = useAuth()
  const generation = getCurrentWorkspaceGeneration()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const busy = useRef(false)
  const [overviewDraft, setOverviewDraft] = useState<{ userId: string; kinds: OverviewItemKind[] } | null>(null)
  const queryKey = ['user', user?.id ?? null, 'preferences'] as const
  const query = useQuery({ ...consoleQueryPolicy('preferences'), queryKey, queryFn: fetchUserPreferences, enabled: Boolean(user?.id) })
  const refetch = query.refetch
  const defaultCalendarView = query.data?.defaultCalendarView ?? 'week'
  const overviewItemKinds = query.data?.overviewItemKinds ?? defaultOverviewItemKinds
  const draftOverviewItemKinds = overviewDraft && overviewDraft.userId === user?.id ? overviewDraft.kinds : overviewItemKinds
  const hasOverviewChanges = !equalOverviewItemKinds(draftOverviewItemKinds, overviewItemKinds)

  const retry = useCallback(() => refetch(), [refetch])

  async function savePreferences(patch: Partial<UserPreferences>): Promise<boolean> {
    if (!user?.id || busy.current || !query.data) return false
    busy.current = true
    setIsSaving(true)
    try {
      await saveUserPreferences(patch)
      if (generation !== getCurrentWorkspaceGeneration()) {
        // A workspace switch keeps this user query mounted; sign-out clears it.
        if (queryClient.getQueryState(queryKey)) void queryClient.invalidateQueries({ queryKey, exact: true })
        return false
      }
      void queryClient.cancelQueries({ queryKey, exact: true })
      queryClient.setQueryData<UserPreferences>(queryKey, current => current ? { ...current, ...patch } : current)
      toast({ title: 'Preference saved', variant: 'success' })
      return true
    } catch (cause) {
      toast({ title: 'Could not save preference', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'error' })
      return false
    } finally {
      busy.current = false
      setIsSaving(false)
    }
  }

  async function changeDefaultCalendarView(value: string | null): Promise<void> {
    const view = calendarViewOptions.find(option => option.value === value)?.value
    if (view && view !== defaultCalendarView) await savePreferences({ defaultCalendarView: view })
  }

  function changeOverviewItemKinds(values: string[]): void {
    if (user?.id && !busy.current) setOverviewDraft({ userId: user.id, kinds: normalizeOverviewItemKinds(values) })
  }

  async function saveOverviewItemKinds(): Promise<void> {
    if (hasOverviewChanges && await savePreferences({ overviewItemKinds: draftOverviewItemKinds })) setOverviewDraft(null)
  }

  return {
    state: { defaultCalendarView, overviewItemKinds, draftOverviewItemKinds, hasOverviewChanges, isLoading: query.isPending, isSaving, error: query.data === undefined ? query.error : null },
    actions: { changeDefaultCalendarView, changeOverviewItemKinds, saveOverviewItemKinds, retry },
    meta: { viewOptions: calendarViewOptions, overviewItemOptions },
  }
}
