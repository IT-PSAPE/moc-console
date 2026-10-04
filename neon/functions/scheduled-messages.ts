import { prepareScheduledMessages } from '@moc/backend/workers/scheduled-messages'
import { processPendingScheduledDeliveries } from '../../apps/api/server/notifications/delivery-store.js'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

const TRIGGER_NAME = 'moc-scheduled-messages-hourly'

export default async function fetch(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, TRIGGER_NAME)
  if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })
  try {
    await prepareScheduledMessages()
    const deliveries = await processPendingScheduledDeliveries()
    return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, deliveries })
  } catch (error) {
    console.error('Scheduled message trigger failed', error)
    return jsonResponse(500, { error: 'Scheduled message delivery failed' })
  }
}
