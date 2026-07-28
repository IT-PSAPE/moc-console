import { resolveZoomOAuthConfig, revokeZoomAccessToken } from "../../../server/zoom-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"
import { applyCors } from "../../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../../server/http.js"

type RequestBody = {
  token?: unknown
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
  const token = typeof body.token === "string" ? body.token : null

  if (!token) {
    response.status(400).json({ error: "Missing access token" })
    return
  }

  try {
    const config = resolveZoomOAuthConfig(process.env)
    await revokeZoomAccessToken(config, token)
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error("Zoom token revoke failed:", error)
    response.status(500).json({ error: "Zoom token revoke failed" })
  }
}
