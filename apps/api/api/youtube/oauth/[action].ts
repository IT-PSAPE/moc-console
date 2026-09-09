import exchange from "../../../server/handlers/youtube/oauth/exchange.js"
import refresh from "../../../server/handlers/youtube/oauth/refresh.js"
import revoke from "../../../server/handlers/youtube/oauth/revoke.js"
import { dispatchNamedRoute, type ApiHandler } from "../../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"
import { observeApiRequest } from "../../../server/observability.js"

const routes: Readonly<Record<string, ApiHandler>> = { exchange, refresh, revoke }

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("youtube.oauth", request, response, async () => {
    await dispatchNamedRoute(request, response, "action", routes)
  })
}
