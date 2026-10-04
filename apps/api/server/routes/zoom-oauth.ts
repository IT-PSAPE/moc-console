import exchange from "../handlers/zoom/oauth/exchange.js"
import refresh from "../handlers/zoom/oauth/refresh.js"
import revoke from "../handlers/zoom/oauth/revoke.js"
import webhook from "../handlers/zoom/oauth/webhook.js"
import { dispatchNamedRoute, routeParameterValue, type ApiHandler } from "../route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../http.js"
import { observeApiRequest } from "../observability.js"

const routes: Readonly<Record<string, ApiHandler>> = { exchange, refresh, revoke, webhook }

export function createZoomOAuthHandler(webhookHandler: ApiHandler = webhook): ApiHandler {
  const routeHandlers = { ...routes, webhook: webhookHandler }

  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    const isWebhook = routeParameterValue(request, "action") === "webhook"
    const route = isWebhook ? "zoom.webhook" : "zoom.oauth"

    try {
      await observeApiRequest(route, request, response, async () => {
        await dispatchNamedRoute(request, response, "action", routeHandlers)
      })
    } catch (error) {
      if (!isWebhook) throw error
      // The observer has recorded the internal failure; never expose a signed
      // webhook payload, signature, or provider identifier to the caller.
      response.status(500).json({ error: "Zoom webhook processing failed" })
    }
  }
}

export default createZoomOAuthHandler()
