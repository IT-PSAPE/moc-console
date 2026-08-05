import { useCallback, useState, type ChangeEvent } from 'react'
import { deleteBooking } from '@/data/mutate-booking'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { parseBrowserDateTimeInputToUtcIso } from '@moc/utils/browser-date-time'
import type { Booking, BookingStatus } from '@moc/types/equipment'
import { useBookingCollection } from './use-booking-collection'
import { useBookingStore } from './use-booking-store'
import { useEquipment } from './equipment-provider'

export function useBookingEditor(booking: Booking, onDeleted?: () => void) {
    const { toast } = useFeedback()
    const { actions: { syncBooking, refreshEquipment, removeBooking } } = useEquipment()
    const store = useBookingStore(booking, { syncBooking })
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const collection = useBookingCollection({
        booking: store.state.draft,
        onItemCollected: (item) => toast({ title: 'Item collected', description: item.equipmentName, variant: 'success' }),
        onItemAlreadyCollected: (item) => toast({ title: 'Already collected', description: `${item.equipmentName} was already scanned.`, variant: 'error' }),
        onUnknownCode: () => toast({ title: 'Item not in booking', description: 'That QR code does not match any equipment in this booking.', variant: 'error' }),
    })

    const save = useCallback(async () => {
        try {
            await store.actions.save()
            await refreshEquipment()
            toast({ title: 'Booking saved', variant: 'success' })
            return true
        } catch (error) {
            toast({ title: 'Failed to save booking', description: getErrorMessage(error, 'The booking could not be saved.'), variant: 'error' })
            return false
        }
    }, [refreshEquipment, store.actions, toast])

    const remove = useCallback(async () => {
        setIsDeleting(true)
        try {
            await deleteBooking(booking.id)
            removeBooking(booking.id)
            await refreshEquipment()
            toast({ title: 'Booking deleted', variant: 'success' })
            setDeleteOpen(false)
            onDeleted?.()
        } catch (error) {
            toast({ title: 'Failed to delete booking', description: getErrorMessage(error, 'The booking could not be deleted.'), variant: 'error' })
        } finally {
            setIsDeleting(false)
        }
    }, [booking.id, onDeleted, refreshEquipment, removeBooking, toast])

    function selectStatus(status: BookingStatus) {
        const previousStatus = store.state.draft.status
        store.actions.updateField('status', status)
        if (status === 'checked_out' && previousStatus !== 'checked_out') store.actions.updateField('checkedOutDate', new Date().toISOString())
        if (status === 'returned' && !store.state.draft.returnedDate) store.actions.updateField('returnedDate', new Date().toISOString())
    }

    function changeBookedBy(event: ChangeEvent<HTMLInputElement>) {
        store.actions.updateField('bookedBy', event.target.value)
    }

    function changeCheckedOutDate(value: string) {
        store.actions.updateField('checkedOutDate', value ? parseBrowserDateTimeInputToUtcIso(value) : '')
    }

    function changeExpectedReturn(value: string) {
        store.actions.updateField('expectedReturnAt', value ? parseBrowserDateTimeInputToUtcIso(value) : '')
    }

    function changeReturnedDate(value: string) {
        store.actions.updateField('returnedDate', value ? parseBrowserDateTimeInputToUtcIso(value) : null)
    }

    function changeNotes(event: ChangeEvent<HTMLTextAreaElement>) {
        store.actions.updateField('notes', event.target.value)
    }

    return {
        store,
        collection,
        state: { deleteOpen, isDeleting },
        actions: { save, remove, setDeleteOpen, selectStatus, changeBookedBy, changeCheckedOutDate, changeExpectedReturn, changeReturnedDate, changeNotes },
    }
}
