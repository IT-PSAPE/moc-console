import { resolveZoomOAuthConfig, revokeZoomAccessToken } from "../../../server/zoom-oauth.js"
import { AuthError, requireAuthenticatedUser } from "../../../server/auth-guard.js"

type ApiRequest = {
  method?: string
  body?: unknown
  headers?: Record<string, string | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type RequestBody = {
  token?: unknown
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  try {
    await requireAuthenticatedUser(request.headers)
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
