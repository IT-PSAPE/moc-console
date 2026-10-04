import { moc } from '@/lib/moc-client'
import { workspaceId } from '@/lib/workspace'
import type { BookingFormData, SubmitBookingResult } from '@/types/booking'

export async function submitPublicBookingBatch(data: BookingFormData): Promise<SubmitBookingResult> {
  const result = await moc.publicSubmissions.submitBooking(workspaceId, {
    title: data.title.trim(),
    equipmentIds: data.equipmentIds,
    bookedBy: data.bookedBy,
    checkedOutAt: new Date(data.checkedOutAt).toISOString(),
    expectedReturnAt: new Date(data.expectedReturnAt).toISOString(),
    notes: data.notes || null,
    requestedEquipment: data.requestedEquipment,
    otherEquipment: data.otherEquipment.trim() || null,
  })
  moc.publicSubmissions.notifyCreated('booking', result.bookingId, result.trackingCode)
  return result
}
