import entityChanged from "../../../server/handlers/notifications/internal/entity-changed.js"
import meetingCreated from "../../../server/handlers/notifications/internal/meeting-created.js"
import meetingUpdated from "../../../server/handlers/notifications/internal/meeting-updated.js"
import streamCreated from "../../../server/handlers/notifications/internal/stream-created.js"
import streamUpdated from "../../../server/handlers/notifications/internal/stream-updated.js"
import { dispatchNamedRoute, type ApiHandler } from "../../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"
import { observeApiRequest } from "../../../server/observability.js"

const routes: Readonly<Record<string, ApiHandler>> = {
  "meeting-created": meetingCreated,
  "meeting-updated": meetingUpdated,
  "stream-created": streamCreated,
  "stream-updated": streamUpdated,
  "entity-changed": entityChanged,
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("notifications.internal", request, response, async () => {
    await dispatchNamedRoute(request, response, "event", routes)
  })
}
