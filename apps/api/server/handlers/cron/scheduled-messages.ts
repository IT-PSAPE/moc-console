import { requireAuthorizedCronGet } from '../../cron-auth.js'
import type { ApiRequest, ApiResponse } from '../../http.js'
import { processPendingScheduledDeliveries } from '../../notifications/delivery-store.js'
import { prepareScheduledMessages } from '../../scheduled-messages/worker.js'

/** Hourly Hobby jobs share the existing queue and its atomic delivery claims. */
export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  response.setHeader('Content-Type', 'application/json')
  if (!requireAuthorizedCronGet(request, response)) return
  try {
    await prepareScheduledMessages()
    const deliveries = await processPendingScheduledDeliveries()
    response.status(200).json({ ok: true, deliveries })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Scheduled message delivery failed' })
  }
}
