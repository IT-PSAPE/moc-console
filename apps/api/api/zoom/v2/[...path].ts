import { proxyZoomApiRequest, sanitizeZoomProxyResponseBody } from "../../../server/zoom-api.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { writeCorsHeaders } from "../../../server/cors.js"
import { requireWorkspacePermission } from "../../../server/workspace-access.js"
import { authorizeProviderRoute, prepareProviderBody, type ProviderRouteRule } from "../../../server/provider-route-policy.js"
import { providerFailure } from "../../../server/provider-failure.js"
import { allowProviderProxyRequest } from "../../../server/provider-rate-limit.js"
import { observeApiRequest } from "../../../server/observability.js"

type ApiRequest = {
  body?: unknown
  headers?: Record<string, string | undefined>
  method?: string
  url?: string
}

type ApiResponse = {
  end: (body?: string | Uint8Array) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

const WORKSPACE_HEADER = "x-moc-workspace"
const ROUTE_PREFIX = "/api/zoom/v2"

const JSON_BODY_LIMIT = 128 * 1024
export const ZOOM_ROUTES: readonly ProviderRouteRule[] = [
  { method: "GET", path: /^\/users\/me\/meetings$/, query: ["type", "page_size", "next_page_token"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/users\/me\/meetings$/, query: [], permission: "can_create", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "PATCH", path: /^\/meetings\/[A-Za-z0-9_-]+$/, query: [], permission: "can_update", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "DELETE", path: /^\/meetings\/[A-Za-z0-9_-]+$/, query: [], permission: "can_delete", body: "none", maxBodyBytes: 0 },
]

async function handleZoomProxy(request: ApiRequest, response: ApiResponse): Promise<void> {
  const isPreflight = request.method === "OPTIONS"
  writeCorsHeaders(request.headers, response, { preflight: isPreflight })
  if (isPreflight) {
    response.statusCode = 204
    response.end()
    return
  }

  response.setHeader("Content-Type", "application/json")

  let userId: string
  try {
    const user = await requireAuthenticatedUser(request.headers)
    userId = user.userId
  } catch (error) {
    response.statusCode = error instanceof AuthError ? 401 : 500
    response.end(JSON.stringify({ error: error instanceof AuthError ? "Unauthorized" : "Authentication check failed" }))
    return
  }

  const workspaceId = request.headers?.[WORKSPACE_HEADER] ?? request.headers?.[WORKSPACE_HEADER.toUpperCase()]
  if (!workspaceId) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: "Missing workspace context" }))
    return
  }

  let route
  try {
    route = authorizeProviderRoute(request.method, request.url, ROUTE_PREFIX, ZOOM_ROUTES)
    await requireWorkspacePermission(userId, workspaceId, route.permission)
    if (!await allowProviderProxyRequest(response, userId, workspaceId, "zoom", request.method)) return
  } catch (error) {
    console.error("Zoom proxy authorization failed:", error)
    const failure = providerFailure("Zoom", error)
    response.statusCode = failure.status
    response.end(JSON.stringify(failure.body))
    return
  }

  try {
    const prepared = prepareProviderBody(request.body, route.body, route.maxBodyBytes)
    const proxyResponse = await proxyZoomApiRequest({
      body: prepared.body,
      contentType: prepared.contentType ?? request.headers?.["content-type"] ?? null,
      method: request.method ?? "GET",
      path: route.path,
      workspaceId,
    })

    response.statusCode = proxyResponse.status

    const contentType = proxyResponse.headers.get("content-type")
    if (contentType) {
      response.setHeader("Content-Type", contentType)
    }

    response.end(sanitizeZoomProxyResponseBody(new Uint8Array(await proxyResponse.arrayBuffer())))
  } catch (error) {
    console.error("Zoom proxy request failed:", error)
    const failure = providerFailure("Zoom", error)
    response.statusCode = failure.status
    response.end(JSON.stringify(failure.body))
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("zoom.proxy", request, response, async () => {
    await handleZoomProxy(request, response)
  })
}
