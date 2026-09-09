import type { ApiRequest, ApiResponse } from "../server/http.js"
import { getRuntimeReadiness, observeApiRequest } from "../server/observability.js"

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("health", request, response, async (context) => {
    response.setHeader("Content-Type", "application/json")

    if (request.method !== "GET") {
      response.status(405).json({ error: "Method not allowed", requestId: context.requestId })
      return
    }

    const readiness = getRuntimeReadiness()
    response.status(readiness.ready ? 200 : 503).json({
      deployment: readiness.deployment,
      requestId: context.requestId,
      status: readiness.ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
    })
  })
}
