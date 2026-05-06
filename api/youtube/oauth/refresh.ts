import { refreshYouTubeToken, resolveYouTubeOAuthConfig } from "../../../server/youtube-oauth.js"
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
  refreshToken?: unknown
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
    console.error("YouTube token refresh failed:", error)
    response.status(500).json({ error: "YouTube token refresh failed" })
  }
}
