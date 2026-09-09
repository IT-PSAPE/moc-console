import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS, DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS, fetchNotificationSettings, updateAutoArchiveDays } from '@/data/notification-settings'

function parsePositiveInteger(value: string): number | null {
    const days = Number.parseInt(value, 10)
    return Number.isInteger(days) && days > 0 ? days : null
}

export function useArchiveAutomations() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [requestDaysInput, setRequestDaysInput] = useState(String(DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS))
    const [bookingDaysInput, setBookingDaysInput] = useState(String(DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS))
    const [savedRequestDays, setSavedRequestDays] = useState(DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS)
    const [savedBookingDays, setSavedBookingDays] = useState(DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS)
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            const settings = await fetchNotificationSettings(currentWorkspaceId)
            setSavedRequestDays(settings.autoArchiveCompletedRequestsDays)
            setSavedBookingDays(settings.autoArchiveReturnedBookingsDays)
            setRequestDaysInput(String(settings.autoArchiveCompletedRequestsDays))
            setBookingDaysInput(String(settings.autoArchiveReturnedBookingsDays))
        } catch (error) {
            toast({ title: "Couldn't load archive automations", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    const save = useCallback(async (nextRequestDays: number, nextBookingDays: number) => {
        if (!currentWorkspaceId) return
        try {
            await updateAutoArchiveDays(currentWorkspaceId, nextRequestDays, nextBookingDays)
            setSavedRequestDays(nextRequestDays)
            setSavedBookingDays(nextBookingDays)
            toast({ title: 'Archive automations updated', variant: 'success' })
        } catch (error) {
            setRequestDaysInput(String(savedRequestDays))
            setBookingDaysInput(String(savedBookingDays))
            toast({ title: "Couldn't update archive automations", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        }
    }, [currentWorkspaceId, savedBookingDays, savedRequestDays, toast])

    const changeRequestDays = useCallback((event: ChangeEvent<HTMLInputElement>) => setRequestDaysInput(event.target.value), [])
    const changeBookingDays = useCallback((event: ChangeEvent<HTMLInputElement>) => setBookingDaysInput(event.target.value), [])
    const saveRequestDays = useCallback(async () => {
        const days = parsePositiveInteger(requestDaysInput)
        if (days === null) return setRequestDaysInput(String(savedRequestDays))
        if (days !== savedRequestDays) await save(days, savedBookingDays)
    }, [requestDaysInput, save, savedBookingDays, savedRequestDays])
    const saveBookingDays = useCallback(async () => {
        const days = parsePositiveInteger(bookingDaysInput)
        if (days === null) return setBookingDaysInput(String(savedBookingDays))
        if (days !== savedBookingDays) await save(savedRequestDays, days)
    }, [bookingDaysInput, save, savedBookingDays, savedRequestDays])

    return { state: { requestDaysInput, bookingDaysInput, isLoading }, actions: { changeRequestDays, changeBookingDays, saveRequestDays, saveBookingDays } }
}
