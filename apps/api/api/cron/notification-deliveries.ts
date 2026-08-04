import { isAuthorizedCron } from "../../server/cron-auth.js"
import { processPendingDeliveries } from "../../server/notifications/delivery-store.js"
import { processPendingOutbox } from "../../server/notifications/outbox.js"

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
  if (!isAuthorizedCron(request)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    const outbox = await processPendingOutbox()
    const deliveries = await processPendingDeliveries()
    response.status(200).json({ ok: true, outbox, deliveries })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Failed to process notification deliveries" })
  }
}
