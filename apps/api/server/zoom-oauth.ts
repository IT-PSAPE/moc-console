import { fetchProvider, resolveOAuthConfig } from "./provider-config.js"

const TOKEN_URL = "https://zoom.us/oauth/token"
const REVOKE_URL = "https://zoom.us/oauth/revoke"
const USER_INFO_URL = "https://api.zoom.us/v2/users/me"

export type ZoomOAuthConfig = {
  clientId: string
  clientSecret: string
}

/**
 * Thrown when Zoom rejects a refresh token with `invalid_grant` — the token is
 * permanently dead (revoked, or already spent, since Zoom rotates the refresh
 * token on every use). Mirrors YouTubeReauthRequiredError so the caller can
 * prompt a reconnect instead of retrying a request that can never succeed.
 */
export class ZoomReauthRequiredError extends Error {
  constructor(message = "Zoom refresh token is no longer valid; reconnect required") {
    super(message)
    this.name = "ZoomReauthRequiredError"
  }
}

type ZoomTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

type ZoomUserInfo = {
  zoomUserId: string
  email: string
  displayName: string
}

type ZoomExchangeResponse = ZoomTokenResponse & {
  userInfo: ZoomUserInfo
}

function getBasicAuthHeader(config: ZoomOAuthConfig): string {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")
  return `Basic ${credentials}`
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const data = await response.json() as { reason?: string; error?: string; message?: string }
    return data.reason ?? data.error ?? data.message ?? fallback
  }

  const text = await response.text()
  return text || fallback
}

async function fetchZoomUserInfo(accessToken: string): Promise<ZoomUserInfo> {
  const response = await fetchProvider(USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to fetch Zoom user info"))
  }

  const data = await response.json() as {
    id: string
    email: string
    display_name?: string
    first_name?: string
    last_name?: string
  }

  return {
    zoomUserId: data.id,
    email: data.email,
    displayName: data.display_name || `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
  }
}

export function resolveZoomOAuthConfig(env: Record<string, string | undefined>): ZoomOAuthConfig {
  return resolveOAuthConfig("Zoom OAuth", env, ["ZOOM_CLIENT_ID", "VITE_ZOOM_CLIENT_ID"], ["ZOOM_CLIENT_SECRET"])
}

export async function exchangeZoomCode(config: ZoomOAuthConfig, code: string, redirectUri: string): Promise<ZoomExchangeResponse> {
  const response = await fetchProvider(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(config),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Zoom token exchange failed"))
  }

  const tokens = await response.json() as ZoomTokenResponse
  const userInfo = await fetchZoomUserInfo(tokens.access_token)
  return { ...tokens, userInfo }
}

export async function refreshZoomToken(config: ZoomOAuthConfig, refreshToken: string): Promise<ZoomTokenResponse> {
  const response = await fetchProvider(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(config),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const data = await response.json() as { error?: string; reason?: string; message?: string }
      const detail = data.reason ?? data.message ?? data.error
      if (data.error === "invalid_grant") throw new ZoomReauthRequiredError(detail)
      throw new Error(detail ?? "Zoom token refresh failed")
    }
    throw new Error(await getErrorMessage(response, "Zoom token refresh failed"))
  }

  return response.json() as Promise<ZoomTokenResponse>
}

export async function revokeZoomAccessToken(config: ZoomOAuthConfig, token: string): Promise<void> {
  const response = await fetchProvider(REVOKE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(config),
    },
    body: new URLSearchParams({ token }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Zoom token revoke failed"))
  }
}
