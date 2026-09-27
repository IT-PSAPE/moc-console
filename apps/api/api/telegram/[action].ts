import { handleTelegramMiniApp } from "../../server/telegram-mini-app/handler.js"
import { dispatchNamedRoute, type ApiHandler } from "../../server/route-dispatch.js"
import { handleTelegramWebhook } from "../../server/telegram-webhook.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"

const routes: Readonly<Record<string, ApiHandler>> = {
  webhook: handleTelegramWebhook,
  "mini-app": handleTelegramMiniApp,
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("telegram", request, response, async () => {
    await dispatchNamedRoute(request, response, "action", routes)
  })
}
