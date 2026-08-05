import { useCallback, useState } from 'react'
import { deleteEquipment } from '@/data/mutate-equipment'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import type { Equipment } from '@moc/types/equipment'
import { useEquipment } from './equipment-provider'
import { useEquipmentBookings } from './use-equipment-bookings'
import { useEquipmentStore } from './use-equipment-store'

export function useEquipmentEditor(equipment: Equipment, onDeleted?: () => void, loadBookings = true) {
  const { toast } = useFeedback()
  const { actions: { syncEquipment, removeEquipment, removeBookingItemsByEquipmentId } } = useEquipment()
  const store = useEquipmentStore(equipment, { syncEquipment })
  const bookingHistory = useEquipmentBookings(equipment.id, loadBookings)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const save = useCallback(async () => {
    try {
      await store.actions.save()
      toast({ title: 'Equipment saved', variant: 'success' })
      return true
    } catch (error) {
      toast({ title: 'Failed to save equipment', description: getErrorMessage(error, 'The equipment item could not be saved.'), variant: 'error' })
      return false
    }
  }, [store.actions, toast])

  const remove = useCallback(async () => {
    setIsDeleting(true)
    try {
      await deleteEquipment(equipment.id)
      removeEquipment(equipment.id)
      removeBookingItemsByEquipmentId(equipment.id)
      toast({ title: 'Equipment deleted', variant: 'success' })
      setDeleteOpen(false)
      onDeleted?.()
    } catch (error) {
      toast({ title: 'Failed to delete equipment', description: getErrorMessage(error, 'The equipment item could not be deleted.'), variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }, [equipment.id, onDeleted, removeBookingItemsByEquipmentId, removeEquipment, toast])

  return { store, bookingHistory, state: { deleteOpen, isDeleting }, actions: { save, remove, setDeleteOpen } }
}
