import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserPreferences } from '@moc/sdk/users'
import { fetchUserPreferences, saveUserPreferences } from '@/data/user-preferences'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useAuth } from '@/lib/auth-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { calendarViewOptions } from './calendar-view-options'
import { consoleQueryPolicy } from '@/lib/console-query-policy'

export function useUserPreferencesState() {
  const { user } = useAuth()
  const generation = getCurrentWorkspaceGeneration()
  const queryClient = useQueryClient()
  const { toast } = useFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const queryKey = ['user', user?.id ?? null, 'preferences'] as const
  const query = useQuery({ ...consoleQueryPolicy('preferences'), queryKey, queryFn: fetchUserPreferences, enabled: Boolean(user?.id) })
  const refetch = query.refetch
  const defaultCalendarView = query.data?.defaultCalendarView ?? 'week'

  const retry = useCallback(() => refetch(), [refetch])

  async function changeDefaultCalendarView(value: string | null): Promise<void> {
    const view = calendarViewOptions.find(option => option.value === value)?.value
    if (!user?.id || !view || view === defaultCalendarView || isSaving) return
    setIsSaving(true)
    try {
      await saveUserPreferences({ defaultCalendarView: view })
      if (generation === getCurrentWorkspaceGeneration()) {
        void queryClient.cancelQueries({ queryKey, exact: true })
        queryClient.setQueryData<UserPreferences>(queryKey, current => current ? { ...current, defaultCalendarView: view } : current)
      }
      toast({ title: 'Preference saved', variant: 'success' })
    } catch (cause) {
      toast({ title: 'Could not save preference', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return { state: { defaultCalendarView, isLoading: query.isPending, isSaving, error: query.data === undefined ? query.error : null }, actions: { changeDefaultCalendarView, retry }, meta: { viewOptions: calendarViewOptions } }
}
