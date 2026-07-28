import { refreshZoomToken, resolveZoomOAuthConfig } from "../../../server/zoom-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../server/http.js"

type RequestBody = {
  refreshToken?: unknown
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    await requireAuthenticatedUser(normaliseHeaders(request.headers))
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }
    response.status(500).json({ error: "Authentication check failed" })
    return
  }

  const body = (request.body ?? {}) as RequestBody
  const refreshTokenValue = typeof body.refreshToken === "string" ? body.refreshToken : null

  if (!refreshTokenValue) {
    response.status(400).json({ error: "Missing refresh token" })
    return
  }

  try {
    const config = resolveZoomOAuthConfig(process.env)
    const result = await refreshZoomToken(config, refreshTokenValue)
    response.status(200).json(result)
  } catch (error) {
    console.error("Zoom token refresh failed:", error)
    response.status(500).json({ error: "Zoom token refresh failed" })
  }
}
