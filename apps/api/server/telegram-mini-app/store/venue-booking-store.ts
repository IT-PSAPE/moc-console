import { queryRows } from '@moc/backend/database'
import type { QueryResultRow } from 'pg'

export type VenueRecurrence = { custom:boolean;frequency:'day'|'week'|'month';interval:number;weekdays:number[];end:{type:'year_end'}|{type:'date';date:string}|{type:'count';count:number}|null }
export type VenueOccurrence = { index:number;startsAt:string;endsAt:string }
export type VenueBookingRecord = { id:string;workspaceId:string;title:string;trackingCode:string;status:string;venueName:string;eventName:string|null;eventOther:string|null;startsAt:string;endsAt:string;notes:string|null;recurrence:VenueRecurrence|null;occurrences:VenueOccurrence[] }
type VenueBookingRow = QueryResultRow & { id:string;workspace_id:string;title:string;tracking_code:string;status:string;starts_at:string;ends_at:string;notes:string|null;recurrence:VenueRecurrence|null;event_other:string|null;venue_name:string|null;event_name:string|null }
type SlotRow = QueryResultRow & { occurrence_index:number;slot_start:string;slot_end:string }

function groupOccurrences(slots: SlotRow[]): VenueOccurrence[] {
  const byIndex = new Map<number,{start:string;end:string}>()
  for (const slot of slots) {
    const existing=byIndex.get(slot.occurrence_index)
    if (!existing) byIndex.set(slot.occurrence_index,{start:slot.slot_start,end:slot.slot_end})
    else { if(slot.slot_start<existing.start) existing.start=slot.slot_start; if(slot.slot_end>existing.end) existing.end=slot.slot_end }
  }
  return [...byIndex.entries()].sort(([a],[b])=>a-b).map(([index,span])=>({index,startsAt:span.start,endsAt:span.end}))
}

export async function loadVenueBooking(id: string): Promise<VenueBookingRecord | null> {
  const [row]=await queryRows<VenueBookingRow>(
    `SELECT b.id,b.workspace_id,b.title,b.tracking_code,b.status,b.starts_at,b.ends_at,b.notes,b.recurrence,b.event_other,v.name AS venue_name,e.name AS event_name
     FROM public.venue_bookings b LEFT JOIN public.venues v ON v.id=b.venue_id LEFT JOIN public.venue_events e ON e.id=b.event_id WHERE b.id=$1`,[id],
  )
  if(!row) return null
  const slots=await queryRows<SlotRow>('SELECT occurrence_index,slot_start,slot_end FROM public.venue_booking_slots WHERE venue_booking_id=$1',[id])
  return {id:row.id,workspaceId:row.workspace_id,title:row.title,trackingCode:row.tracking_code,status:row.status,venueName:row.venue_name??'',eventName:row.event_name,eventOther:row.event_other,startsAt:row.starts_at,endsAt:row.ends_at,notes:row.notes,recurrence:row.recurrence,occurrences:groupOccurrences(slots)}
}
