import { useCallback, useEffect, useState } from 'react'
import type { CalendarView } from '@moc/sdk/users'
import { fetchUserPreferences, saveUserPreferences } from '@/data/user-preferences'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { calendarViewOptions } from './calendar-view-options'

export function useUserPreferencesState() {
  const [defaultCalendarView, setDefaultCalendarView] = useState<CalendarView>('week')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { toast } = useFeedback()

  useEffect(() => {
    let active = true
    setIsLoading(true)
    fetchUserPreferences().then(preferences => {
      if (!active) return
      setDefaultCalendarView(preferences.defaultCalendarView)
      setError(null)
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause : new Error('Preferences could not load'))
    }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [attempt])

  const retry = useCallback(() => setAttempt(current => current + 1), [])

  async function changeDefaultCalendarView(value: string | null): Promise<void> {
    const view = calendarViewOptions.find(option => option.value === value)?.value
    if (!view || view === defaultCalendarView || isSaving) return
    setIsSaving(true)
    try {
      await saveUserPreferences({ defaultCalendarView: view })
      setDefaultCalendarView(view)
      toast({ title: 'Preference saved', variant: 'success' })
    } catch (cause) {
      toast({ title: 'Could not save preference', description: cause instanceof Error ? cause.message : 'Please try again.', variant: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return { state: { defaultCalendarView, isLoading, isSaving, error }, actions: { changeDefaultCalendarView, retry }, meta: { viewOptions: calendarViewOptions } }
}
