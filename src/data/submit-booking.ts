import { supabase } from '@/lib/supabase'
import { workspaceId } from '@/lib/workspace'
import type { BookingFormData, SubmitBookingResult } from '@/types/booking'

export async function submitPublicBookingBatch(data: BookingFormData): Promise<SubmitBookingResult> {
  const { data: result, error } = await supabase.rpc('public_submit_booking_batch', {
    p_workspace_id: workspaceId,
    p_equipment_ids: data.equipmentIds,
    p_booked_by: data.bookedBy,
    p_checked_out_at: new Date(data.checkedOutAt).toISOString(),
    p_expected_return_at: new Date(data.expectedReturnAt).toISOString(),
    p_notes: data.notes || null,
  })

  if (error) throw new Error(error.message)

  return { trackingCode: result.tracking_code }
}
