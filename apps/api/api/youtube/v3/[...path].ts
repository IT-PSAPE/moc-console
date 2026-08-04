import { proxyYouTubeApiRequest } from "../../../server/youtube-api.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { writeCorsHeaders } from "../../../server/cors.js"
import { permissionForMethod, WorkspaceAccessError, requireWorkspacePermission } from "../../../server/workspace-access.js"

type ApiRequest = {
  body?: Buffer | string
  headers?: Record<string, string | undefined>
  method?: string
  query?: { path?: string | string[] }
}

type ApiResponse = {
  end: (body?: string | Uint8Array) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

const SEGMENT_PATTERN = /^[A-Za-z0-9_\-.~%@:]+$/
const WORKSPACE_HEADER = "x-moc-workspace"

function buildSafePath(query: ApiRequest["query"]): string | null {
  const rawSegments = query?.path
  const segments = Array.isArray(rawSegments)
    ? rawSegments
    : typeof rawSegments === "string" && rawSegments.length > 0 ? [rawSegments] : []

  if (segments.length === 0 || segments.some((segment) => !segment || segment === "." || segment === ".." || !SEGMENT_PATTERN.test(segment))) {
    return null
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === "path" || value == null) continue
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else params.append(key, value)
  }
  const search = params.toString()
  return `/${segments.join("/")}${search ? `?${search}` : ""}`
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
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
    userId = (await requireAuthenticatedUser(request.headers)).userId
  } catch (error) {
    response.statusCode = error instanceof AuthError ? 401 : 500
    response.end(JSON.stringify({ error: error instanceof AuthError ? "Unauthorized" : "Authentication check failed" }))
    return
  }

  const path = buildSafePath(request.query)
  const workspaceId = request.headers?.[WORKSPACE_HEADER] ?? request.headers?.[WORKSPACE_HEADER.toUpperCase()]
  if (!path || !workspaceId) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: !path ? "Invalid request path" : "Missing workspace context" }))
    return
  }

  try {
    await requireWorkspacePermission(userId, workspaceId, permissionForMethod(request.method))
    const body = typeof request.body === "string" ? Buffer.from(request.body) : request.body
    const proxyResponse = await proxyYouTubeApiRequest({
      body,
      contentType: request.headers?.["content-type"] ?? null,
      method: request.method ?? "GET",
      path,
      workspaceId,
    })
    response.statusCode = proxyResponse.status
    const contentType = proxyResponse.headers.get("content-type")
    if (contentType) response.setHeader("Content-Type", contentType)
    response.end(Buffer.from(await proxyResponse.arrayBuffer()))
  } catch (error) {
    console.error("YouTube proxy request failed:", error)
    response.statusCode = error instanceof WorkspaceAccessError ? 403 : 502
    response.end(JSON.stringify({ error: error instanceof WorkspaceAccessError ? error.message : "YouTube request failed" }))
  }
}
