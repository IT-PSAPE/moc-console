import { refreshZoomToken, resolveZoomOAuthConfig } from "../../../server/zoom-oauth"

type ApiRequest = {
  method?: string
  body?: unknown
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
    const message = error instanceof Error ? error.message : "Zoom token refresh failed"
    response.status(500).json({ error: message })
  }
}
