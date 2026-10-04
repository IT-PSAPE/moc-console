import { queryRows } from '@moc/backend/database'
import { prepareScheduledMessages as prepare } from '@moc/backend/workers/scheduled-messages'
import type { QueryResultRow } from 'pg'
import { processDeliveriesForEvent } from '../notifications/delivery-store.js'

export async function prepareScheduledMessages(): Promise<void> {
  await prepare()
}

export async function syncOccurrence(id: string): Promise<void> {
  const rows = await queryRows<QueryResultRow & { event_key: string }>(
    "SELECT DISTINCT event_key FROM public.notification_deliveries WHERE scheduled_occurrence_id=$1 AND status='pending' ORDER BY event_key",[id],
  )
  for (const row of rows) await processDeliveriesForEvent(row.event_key)
}

export async function syncWorkspace(workspace: string): Promise<void> {
  const rows = await queryRows<QueryResultRow & { event_key: string }>(
    "SELECT DISTINCT event_key FROM public.notification_deliveries WHERE workspace_id=$1 AND scheduled_occurrence_id IS NOT NULL AND scheduled_operation='edit' AND status='pending' ORDER BY event_key",[workspace],
  )
  for (const row of rows) await processDeliveriesForEvent(row.event_key)
}
