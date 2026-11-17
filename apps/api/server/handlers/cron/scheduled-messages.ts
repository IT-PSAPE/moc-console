import { requireAuthorizedCronGet } from '../../cron-auth.js'
import type { ApiRequest, ApiResponse } from '../../http.js'
import { processPendingDeliveries } from '../../notifications/delivery-store.js'
import { processPendingOutbox } from '../../notifications/outbox.js'
import { prepareScheduledMessages } from '../../scheduled-messages/worker.js'

/** Hourly Hobby jobs also recover notifications whose immediate wake was missed. */
export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  response.setHeader('Content-Type', 'application/json')
  if (!requireAuthorizedCronGet(request, response)) return
  try {
    const [scheduled, outbox] = await Promise.allSettled([
      prepareScheduledMessages(),
      processPendingOutbox(),
    ])
    const deliveries = await processPendingDeliveries()
    if (scheduled.status === 'rejected') throw scheduled.reason
    if (outbox.status === 'rejected') throw outbox.reason
    response.status(200).json({ ok: true, outbox: outbox.value, deliveries })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Scheduled message delivery failed' })
  }
}
