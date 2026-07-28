import { exchangeYouTubeCode, resolveYouTubeOAuthConfig } from "../../../server/youtube-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../server/http.js"

type RequestBody = {
  code?: unknown
  redirectUri?: unknown
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
  const code = typeof body.code === "string" ? body.code : null
  const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri : null

  if (!code || !redirectUri) {
    response.status(400).json({ error: "Missing YouTube OAuth payload" })
    return
  }

  try {
    const config = resolveYouTubeOAuthConfig(process.env)
    const result = await exchangeYouTubeCode(config, code, redirectUri)
    response.status(200).json(result)
  } catch (error) {
    console.error("YouTube token exchange failed:", error)
    response.status(500).json({ error: "YouTube token exchange failed" })
  }
}
