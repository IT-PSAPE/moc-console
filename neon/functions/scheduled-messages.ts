import { prepareScheduledMessages } from '@moc/backend/workers/scheduled-messages'
import { processPendingDeliveries } from '../../apps/api/server/notifications/delivery-store.js'
import { processPendingOutbox } from '../../apps/api/server/notifications/outbox.js'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

const TRIGGER_NAME = 'moc-scheduled-messages-hourly'

export default async function fetch(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, TRIGGER_NAME)
  if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })
  try {
    const [scheduled, outbox] = await Promise.allSettled([
      prepareScheduledMessages(),
      processPendingOutbox(),
    ])
    const deliveries = await processPendingDeliveries()
    if (scheduled.status === 'rejected') throw scheduled.reason
    if (outbox.status === 'rejected') throw outbox.reason
    return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, outbox: outbox.value, deliveries })
  } catch (error) {
    console.error('Scheduled message trigger failed', error)
    return jsonResponse(500, { error: 'Scheduled message delivery failed' })
  }
}
