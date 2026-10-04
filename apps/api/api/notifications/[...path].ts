import handler from "../../server/routes/notifications/router.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

export default async function notificationRoute(request: ApiRequest, response: ApiResponse): Promise<void> {
  await handler(request, response)
}
