import { queryRows } from '../database.js'

/** Materialize the rolling schedule window and queue due sends/expiry edits. */
export async function prepareScheduledMessages(): Promise<void> {
  await queryRows('SELECT public.recover_scheduled_deliveries()')
  await queryRows('SELECT public.prepare_scheduled_messages()')
}
