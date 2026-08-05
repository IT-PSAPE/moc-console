import { requireAuthorizedCronGet } from "../../cron-auth.js"
import { purgeApiMaintenanceData } from "../../maintenance-cleanup.js"
import { processPendingDeliveries } from "../../notifications/delivery-store.js"
import { processPendingOutbox } from "../../notifications/outbox.js"

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")
  if (!requireAuthorizedCronGet(request, response)) return

  try {
    const outbox = await processPendingOutbox()
    const deliveries = await processPendingDeliveries()
    const maintenance = await purgeApiMaintenanceData()
    response.status(200).json({ ok: true, outbox, deliveries, maintenance })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Failed to process notification deliveries" })
  }
}
