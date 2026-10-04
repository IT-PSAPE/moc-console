import { purgeApiMaintenanceData } from '../../apps/api/server/maintenance-cleanup.js'
import { syncManagementCommands } from '../../apps/api/server/scheduled-messages/commands.js'
import { processPendingOutbox } from '../../apps/api/server/notifications/outbox.js'
import { processPendingDeliveries } from '../../apps/api/server/notifications/delivery-store.js'
import { jsonResponse, readScheduledTrigger } from './trigger-envelope.js'

const TRIGGER_NAME = 'moc-notification-deliveries-daily'

export default async function fetch(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, TRIGGER_NAME)
  if (!envelope) return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Invalid scheduled trigger invocation' })

  try {
    const commands = await syncManagementCommands()
    const outbox = await processPendingOutbox()
    const deliveries = await processPendingDeliveries()
    const maintenance = await purgeApiMaintenanceData()
    return jsonResponse(200, { ok: true, invocationId: envelope.invocation_id, outbox, deliveries, maintenance, commands })
  } catch (error) {
    console.error('Notification delivery trigger failed', error)
    return jsonResponse(500, { error: 'Failed to process notification deliveries' })
  }
}
