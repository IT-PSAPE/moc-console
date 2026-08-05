import { handlePublicNotificationWake } from "../../server/notifications/public-wake.js"
import { applyCors } from "../../server/cors.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"

// Public callers cannot create notification content. They can only wake the
// durable request.created event written by the submission transaction.
async function handleRequestWake(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")
  await handlePublicNotificationWake(request, response, {
    entityIdField: "request_id",
    entityType: "request",
    eventType: "request.created",
    notFoundMessage: "Request not found",
  })
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("notify.request", request, response, async () => {
    await handleRequestWake(request, response)
  })
}
