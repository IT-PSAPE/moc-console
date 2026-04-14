import { supabase } from '@/lib/supabase'
import { workspaceId } from '@/lib/workspace'
import type { EquipmentCategory, PublicEquipmentItem } from '@/types/equipment'

export async function fetchPublicEquipment(checkedOutAt?: string, expectedReturnAt?: string, search?: string, category?: EquipmentCategory): Promise<PublicEquipmentItem[]> {
  const { data, error } = await supabase.rpc('public_browse_equipment', {
    p_workspace_id: workspaceId,
    p_checked_out_at: checkedOutAt ? new Date(checkedOutAt).toISOString() : null,
    p_expected_return_at: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null,
    p_search: search || null,
    p_category: category || null,
  })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    serialNumber: row.serial_number as string,
    category: row.category as EquipmentCategory,
    status: row.status as PublicEquipmentItem['status'],
    location: row.location as string,
    notes: (row.notes as string) ?? null,
    thumbnailUrl: (row.thumbnail_url as string) ?? null,
    isAvailable: row.is_available as boolean,
  }))
}
