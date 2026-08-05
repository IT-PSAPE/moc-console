import meetingCreated from "../../../server/handlers/notifications/internal/meeting-created.js"
import streamCreated from "../../../server/handlers/notifications/internal/stream-created.js"
import { dispatchNamedRoute, type ApiHandler } from "../../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"

const routes: Readonly<Record<string, ApiHandler>> = {
  "meeting-created": meetingCreated,
  "stream-created": streamCreated,
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await dispatchNamedRoute(request, response, "event", routes)
}
