import exchange from "../../../server/handlers/zoom/oauth/exchange.js"
import refresh from "../../../server/handlers/zoom/oauth/refresh.js"
import revoke from "../../../server/handlers/zoom/oauth/revoke.js"
import webhook from "../../../server/handlers/zoom/oauth/webhook.js"
import { dispatchNamedRoute, routeParameterValue, type ApiHandler } from "../../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../../server/http.js"
import { observeApiRequest } from "../../../server/observability.js"

const routes: Readonly<Record<string, ApiHandler>> = { exchange, refresh, revoke, webhook }

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  const route = routeParameterValue(request, "action") === "webhook" ? "zoom.webhook" : "zoom.oauth"
  await observeApiRequest(route, request, response, async () => {
    await dispatchNamedRoute(request, response, "action", routes)
  })
}
