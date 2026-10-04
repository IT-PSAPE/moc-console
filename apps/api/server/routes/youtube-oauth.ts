import exchange from "../handlers/youtube/oauth/exchange.js"
import refresh from "../handlers/youtube/oauth/refresh.js"
import revoke from "../handlers/youtube/oauth/revoke.js"
import { dispatchNamedRoute, type ApiHandler } from "../route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../http.js"
import { observeApiRequest } from "../observability.js"

const routes: Readonly<Record<string, ApiHandler>> = { exchange, refresh, revoke }

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("youtube.oauth", request, response, async () => {
    await dispatchNamedRoute(request, response, "action", routes)
  })
}
