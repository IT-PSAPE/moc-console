import { proxyYouTubeApiRequest } from "../youtube-api.js"
import { AuthError, requireAuthenticatedUser } from "../auth-guard.js"
import { writeCorsHeaders } from "../cors.js"
import { requireWorkspacePermission } from "../workspace-access.js"
import { authorizeProviderRoute, prepareProviderBody, type ProviderRouteRule } from "../provider-route-policy.js"
import { providerFailure } from "../provider-failure.js"
import { allowProviderProxyRequest } from "../provider-rate-limit.js"
import { observeApiRequest } from "../observability.js"
import { PROVIDER_RECORDS_PATH, resolveProviderRecordsResponse } from "../provider-records.js"
import { headerValue, normaliseHeaders, type ApiRequest, type ApiResponse as SharedApiResponse } from "../http.js"

type ApiResponse = SharedApiResponse & { end: (body?: string | Uint8Array) => void; statusCode: number }

const WORKSPACE_HEADER = "x-moc-workspace"
const ROUTE_PREFIX = "/api/youtube/v3"

const JSON_BODY_LIMIT = 256 * 1024
const THUMBNAIL_BODY_LIMIT = 2 * 1024 * 1024
export const YOUTUBE_ROUTES: readonly ProviderRouteRule[] = [
  { method: "GET", path: /^\/moc-records$/, query: ["id"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/channels$/, query: ["part", "mine"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/videoCategories$/, query: ["part", "regionCode"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/playlists$/, query: ["part", "mine", "maxResults", "pageToken"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/videos$/, query: ["part", "id"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "PUT", path: /^\/videos$/, query: ["part"], permission: "can_update", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "GET", path: /^\/liveBroadcasts$/, query: ["part", "id", "broadcastStatus", "broadcastType", "maxResults", "pageToken"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/liveBroadcasts$/, query: ["part"], permission: "can_create", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "PUT", path: /^\/liveBroadcasts$/, query: ["part"], permission: "can_update", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "DELETE", path: /^\/liveBroadcasts$/, query: ["id"], permission: "can_delete", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/liveBroadcasts\/bind$/, query: ["id", "part", "streamId"], permission: "can_update", body: "none", maxBodyBytes: 0 },
  { method: "GET", path: /^\/liveStreams$/, query: ["part", "id", "mine", "maxResults", "pageToken"], permission: "can_read", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/liveStreams$/, query: ["part"], permission: "can_create", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
  { method: "DELETE", path: /^\/liveStreams$/, query: ["id"], permission: "can_delete", body: "none", maxBodyBytes: 0 },
  { method: "POST", path: /^\/thumbnails\/set$/, query: ["videoId", "uploadType"], permission: "can_update", body: "image", maxBodyBytes: THUMBNAIL_BODY_LIMIT },
  { method: "POST", path: /^\/playlistItems$/, query: ["part"], permission: "can_update", body: "json", maxBodyBytes: JSON_BODY_LIMIT },
]

async function handleYouTubeProxy(request: ApiRequest, response: ApiResponse): Promise<void> {
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
    userId = (await requireAuthenticatedUser(normaliseHeaders(request.headers))).userId
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

  try {
    const route = authorizeProviderRoute(request.method, request.url, ROUTE_PREFIX, YOUTUBE_ROUTES)
    await requireWorkspacePermission(userId, workspaceId, route.permission)
    if (!await allowProviderProxyRequest(response, userId, workspaceId, "youtube", request.method)) return
    if (route.path === PROVIDER_RECORDS_PATH || route.path.startsWith(`${PROVIDER_RECORDS_PATH}?`)) {
      const result = await resolveProviderRecordsResponse("youtube", route.path, workspaceId)
      response.statusCode = result.status
      response.end(JSON.stringify(result.body))
      return
    }

    const prepared = prepareProviderBody(request.body, route.body, route.maxBodyBytes)
    const proxyResponse = await proxyYouTubeApiRequest({
      body: prepared.body,
      contentType: prepared.contentType ?? headerValue(request.headers, "content-type"),
      method: request.method ?? "GET",
      path: route.path,
      workspaceId,
    })
    response.statusCode = proxyResponse.status
    const contentType = proxyResponse.headers.get("content-type")
    if (contentType) response.setHeader("Content-Type", contentType)
    response.end(Buffer.from(await proxyResponse.arrayBuffer()))
  } catch (error) {
    console.error("YouTube proxy request failed:", error)
    const failure = providerFailure("YouTube", error)
    response.statusCode = failure.status
    response.end(JSON.stringify(failure.body))
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("youtube.proxy", request, response, async () => {
    await handleYouTubeProxy(request, response)
  })
}
