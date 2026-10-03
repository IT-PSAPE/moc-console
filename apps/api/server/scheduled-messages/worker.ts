import { getSupabaseAdmin } from '../supabase-admin.js'
import { processDeliveriesForEvent } from '../notifications/delivery-store.js'
import { scheduledRpc } from './store.js'

export async function prepareScheduledMessages(): Promise<void> {
  await scheduledRpc('recover_scheduled_deliveries')
  await scheduledRpc('prepare_scheduled_messages')
}
export async function syncOccurrence(id: string): Promise<void> {
  const {data,error}=await getSupabaseAdmin().from('notification_deliveries').select('event_key').eq('scheduled_occurrence_id',id).eq('status','pending')
  if(error) throw new Error(error.message)
  for(const row of data??[]) await processDeliveriesForEvent(row.event_key as string)
}
export async function syncWorkspace(workspace: string): Promise<void> {
  const {data,error}=await getSupabaseAdmin().from('notification_deliveries').select('event_key').eq('workspace_id',workspace).not('scheduled_occurrence_id','is',null).eq('scheduled_operation','edit').eq('status','pending')
  if(error) throw new Error(error.message)
  for(const row of data??[]) await processDeliveriesForEvent(row.event_key as string)
}
