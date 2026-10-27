import { processPendingConsolePushDeliveries } from '../../apps/api/server/push/delivery-store.js'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

const TRIGGER_NAME = 'moc-console-push-minutely'

export default async function fetch(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, TRIGGER_NAME)
  if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })

  try {
    const deliveries = await processPendingConsolePushDeliveries()
    return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, deliveries })
  } catch {
    console.error('Console push delivery trigger failed')
    return jsonResponse(500, { error: 'Failed to process Console push deliveries' })
  }
}
