import { refreshYouTubeToken, resolveYouTubeOAuthConfig, YouTubeReauthRequiredError } from "../../../server/youtube-oauth.js"
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
    const config = resolveYouTubeOAuthConfig(process.env)
    const result = await refreshYouTubeToken(config, refreshTokenValue)
    response.status(200).json(result)
  } catch (error) {
    if (error instanceof YouTubeReauthRequiredError) {
      // Refresh token is permanently dead — the client must persist
      // reauth_required and prompt a reconnect. Not retryable.
      response.status(401).json({ error: error.message, code: "reauth_required" })
      return
    }
    // Transient failure (network, Google 5xx). Safe to retry later.
    console.error("YouTube token refresh failed:", error)
    response.status(502).json({ error: "YouTube token refresh failed" })
  }
}
