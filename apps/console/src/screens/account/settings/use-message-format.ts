import { useCallback, useEffect, useState } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE, type DateFormatPreset, DATE_FORMAT_OPTIONS, formatInstant } from '@moc/notifications'
import { fetchNotificationSettings, updateMessageFormat } from '@/data/notification-settings'

const COMMON_TIMEZONES = ['Africa/Harare', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']
const EXAMPLE_INSTANT = '2026-05-21T17:00:00Z'

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

    const timezoneOptions = COMMON_TIMEZONES.includes(timezone) ? COMMON_TIMEZONES : [timezone, ...COMMON_TIMEZONES]
    const timezoneItems = timezoneOptions.map(value => ({ label: value, value }))
    const dateFormatItems = DATE_FORMAT_OPTIONS.map(option => ({ label: formatInstant(EXAMPLE_INSTANT, timezone, option.value), value: option.value }))

    return { state: { timezone, dateFormat, isLoading, timezoneItems, dateFormatItems }, actions: { changeTimezone, changeDateFormat } }
}
