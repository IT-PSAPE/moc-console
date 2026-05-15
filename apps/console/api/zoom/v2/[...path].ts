import { proxyZoomApiRequest } from "../../../server/zoom-api.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"

type ApiRequest = {
  body?: Buffer | string
  headers?: Record<string, string | undefined>
  method?: string
  query?: {
    path?: string | string[]
  }
}

type ApiResponse = {
  end: (body?: string | Uint8Array) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

const SEGMENT_PATTERN = /^[A-Za-z0-9_\-.~%@:]+$/

function buildSafePath(query: ApiRequest["query"]): string | null {
  const rawSegments = query?.path
  const segments = Array.isArray(rawSegments)
    ? rawSegments
    : typeof rawSegments === "string" && rawSegments.length > 0
      ? [rawSegments]
      : []

  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || !SEGMENT_PATTERN.test(segment)) {
      return null
    }
  }

  const pathname = segments.length > 0 ? `/${segments.join("/")}` : "/"

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === "path" || value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, item)
    } else {
      searchParams.append(key, value)
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  try {
    await requireAuthenticatedUser(request.headers)
  } catch (error) {
    response.statusCode = error instanceof AuthError ? 401 : 500
    response.end(JSON.stringify({ error: error instanceof AuthError ? "Unauthorized" : "Authentication check failed" }))
    return
  }

  const path = buildSafePath(request.query)
  if (!path) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: "Invalid request path" }))
    return
  }

  try {
    const body = typeof request.body === "string" ? Buffer.from(request.body) : request.body
    const proxyResponse = await proxyZoomApiRequest({
      authorization: request.headers?.authorization ?? null,
      body,
      contentType: request.headers?.["content-type"] ?? null,
      method: request.method ?? "GET",
      path,
    })

    response.statusCode = proxyResponse.status

    const contentType = proxyResponse.headers.get("content-type")
    if (contentType) {
      response.setHeader("Content-Type", contentType)
    }

    response.end(Buffer.from(await proxyResponse.arrayBuffer()))
  } catch (error) {
    console.error("Zoom proxy request failed:", error)
    response.statusCode = 502
    response.end(JSON.stringify({ error: "Zoom request failed" }))
  }
}
