import { useCallback, useEffect, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE, type DateFormatPreset } from '@moc/notifications'
import { fetchNotificationSettings, updateMessageFormat } from '@/data/notification-settings'

export function useMessageFormat() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)
    const [dateFormat, setDateFormat] = useState<DateFormatPreset>(DEFAULT_DATE_FORMAT)
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const settings = await fetchNotificationSettings(currentWorkspaceId)
            setTimezone(settings.timezone)
            setDateFormat(settings.dateFormat)
        } catch (error) {
            toast({ title: "Couldn't load formatting settings", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    const save = useCallback(async (nextTimezone: string, nextFormat: DateFormatPreset) => {
        if (!currentWorkspaceId) return
        try {
            await updateMessageFormat(currentWorkspaceId, nextTimezone, nextFormat)
            toast({ title: 'Message format updated', variant: 'success' })
        } catch (error) {
            toast({ title: "Couldn't update format", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
            void load()
        }
    }, [currentWorkspaceId, load, toast])

    const changeTimezone = useCallback((next: string | null) => {
        if (next === null) return
        setTimezone(next)
        void save(next, dateFormat)
    }, [dateFormat, save])

    const changeDateFormat = useCallback((next: DateFormatPreset | null) => {
        if (next === null) return
        setDateFormat(next)
        void save(timezone, next)
    }, [save, timezone])

    return { state: { timezone, dateFormat, isLoading }, actions: { changeTimezone, changeDateFormat } }
}
