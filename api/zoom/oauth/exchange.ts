import { exchangeZoomCode, resolveZoomOAuthConfig } from "../../../server/zoom-oauth"

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
  code?: unknown
  redirectUri?: unknown
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const body = (request.body ?? {}) as RequestBody
  const code = typeof body.code === "string" ? body.code : null
  const redirectUri = typeof body.redirectUri === "string" ? body.redirectUri : null

  if (!code || !redirectUri) {
    response.status(400).json({ error: "Missing Zoom OAuth payload" })
    return
  }

  try {
    const config = resolveZoomOAuthConfig(process.env)
    const result = await exchangeZoomCode(config, code, redirectUri)
    response.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom token exchange failed"
    response.status(500).json({ error: message })
  }
}
