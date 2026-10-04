import { proxyZoomApiRequest, sanitizeZoomProxyResponseBody } from "../zoom-api.js"
import { AuthError, requireAuthenticatedUser } from "../auth-guard.js"
import { writeCorsHeaders } from "../cors.js"
import { requireWorkspacePermission } from "../workspace-access.js"
import { authorizeProviderRoute, prepareProviderBody, type ProviderRouteRule } from "../provider-route-policy.js"
import { providerFailure } from "../provider-failure.js"
import { allowProviderProxyRequest } from "../provider-rate-limit.js"
import { observeApiRequest } from "../observability.js"
import {
  PROVIDER_RECORDS_PATH,
  readProviderRecords,
  resolveProviderRecordsResponse,
  type ProviderRecordsReader,
} from "../provider-records.js"
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse as SharedApiResponse } from "../http.js"

type ApiResponse = SharedApiResponse & { end: (body?: string | Uint8Array) => void; statusCode: number }

export type ZoomProxyDependencies = {
  authenticate: typeof requireAuthenticatedUser
  authorize: typeof requireWorkspacePermission
  proxyRequest: typeof proxyZoomApiRequest
  rateLimit: typeof allowProviderProxyRequest
  readRecords: ProviderRecordsReader
}

const productionDependencies: ZoomProxyDependencies = {
  authenticate: requireAuthenticatedUser,
  authorize: requireWorkspacePermission,
  proxyRequest: proxyZoomApiRequest,
  rateLimit: allowProviderProxyRequest,
  readRecords: readProviderRecords,
}

const WORKSPACE_HEADER = "x-moc-workspace"
const ROUTE_PREFIX = "/api/zoom/v2"

const JSON_BODY_LIMIT = 128 * 1024
export const ZOOM_ROUTES: readonly ProviderRouteRule[] = [
  { method: "GET", path: /^\/moc-records$/, query: ["id"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/users\/me\/meetings$/, query: ["type", "page_size", "next_page_token"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/users\/me\/meetings$/, query: [], permission: "can_create", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "GET", path: /^\/meetings\/[A-Za-z0-9_-]+$/, query: [], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "PATCH", path: /^\/meetings\/[A-Za-z0-9_-]+$/, query: [], permission: "can_update", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "DELETE", path: /^\/meetings\/[A-Za-z0-9_-]+$/, query: [], permission: "can_delete", body: "none", maxBodyBytes: 0 },
]

async function handleZoomProxy(
  request: ApiRequest,
  response: ApiResponse,
  dependencies: ZoomProxyDependencies,
): Promise<void> {
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
    const user = await dependencies.authenticate(normaliseHeaders(request.headers))
    userId = user.userId
  } catch (error) {
    response.statusCode = error instanceof AuthError ? 401 : 500
    response.end(JSON.stringify({ error: error instanceof AuthError ? "Unauthorized" : "Authentication check failed" }))
    return
  }

  const workspaceId = headerValue(request.headers, WORKSPACE_HEADER)
  if (!workspaceId) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: "Missing workspace context" }))
    return
  }

  let route
  try {
    route = authorizeProviderRoute(request.method, request.url, ROUTE_PREFIX, ZOOM_ROUTES)
    await dependencies.authorize(userId, workspaceId, route.permission)
    if (!await dependencies.rateLimit(response, userId, workspaceId, "zoom", request.method)) return
  } catch (error) {
    console.error("Zoom proxy authorization failed:", error)
    const failure = providerFailure("Zoom", error)
    response.statusCode = failure.status
    response.end(JSON.stringify(failure.body))
    return
  }

  try {
    if (route.path === PROVIDER_RECORDS_PATH || route.path.startsWith(`${PROVIDER_RECORDS_PATH}?`)) {
      const result = await resolveProviderRecordsResponse("zoom", route.path, workspaceId, dependencies.readRecords)
      response.statusCode = result.status
      response.end(JSON.stringify(result.body))
      return
    }

    const prepared = prepareProviderBody(request.body, route.body, route.maxBodyBytes)
    const proxyResponse = await dependencies.proxyRequest({
      body: prepared.body,
      contentType: prepared.contentType ?? headerValue(request.headers, "content-type"),
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

export function createZoomProxyHandler(
  dependencies: ZoomProxyDependencies = productionDependencies,
): (request: ApiRequest, response: ApiResponse) => Promise<void> {
  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    await observeApiRequest("zoom.proxy", request, response, async () => {
      await handleZoomProxy(request, response, dependencies)
    })
  }
}

export default createZoomProxyHandler()
