import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type BookingItemRecord = { id:string;equipmentId:string;name:string;serialNumber:string;category:string }
export type BookingRecord = { id:string;workspaceId:string;title:string;trackingCode:string;status:string;bookedBy:string;checkedOutAt:string;expectedReturnAt:string;returnedAt:string|null;notes:string|null;items:BookingItemRecord[] }
type BookingRow = QueryResultRow & { id:string;workspace_id:string;title:string;tracking_code:string;status:string;booked_by:string;checked_out_at:string;expected_return_at:string;returned_at:string|null;notes:string|null }
type BookingItemRow = QueryResultRow & { id:string;equipment_id:string;name:string|null;serial_number:string|null;category:string|null }

export async function loadBooking(id: string): Promise<BookingRecord | null> {
  const [row] = await queryRows<BookingRow>(
    'SELECT id,workspace_id,title,tracking_code,status,booked_by,checked_out_at,expected_return_at,returned_at,notes FROM public.bookings WHERE id=$1',[id],
  )
  if (!row) return null
  const items = await queryRows<BookingItemRow>(
    `SELECT bi.id,bi.equipment_id,e.name,e.serial_number,e.category FROM public.booking_items bi
     LEFT JOIN public.equipment e ON e.id=bi.equipment_id WHERE bi.booking_id=$1`,[id],
  )
  return {
    id:row.id,workspaceId:row.workspace_id,title:row.title,trackingCode:row.tracking_code,status:row.status,bookedBy:row.booked_by,
    checkedOutAt:row.checked_out_at,expectedReturnAt:row.expected_return_at,returnedAt:row.returned_at,notes:row.notes,
    items:items.map(item=>({id:item.id,equipmentId:item.equipment_id,name:item.name??'',serialNumber:item.serial_number??'',category:item.category??''})),
  }
}
