import { supabase } from "@moc/data/supabase"
import { buildSessionHeaders } from "./api-auth"
import { getCurrentWorkspaceId } from "@/data/current-workspace"

type ConnectionTokens = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

async function getConnectionTokens(): Promise<ConnectionTokens> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("zoom_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !data) {
    throw new Error("Zoom is not connected for this workspace")
  }

  return data as ConnectionTokens
}

export async function getZoomErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string }
    return data.error ?? fallback
  }

  const text = await response.text()
  return text || fallback
}

/** Returns a valid access token, refreshing if expired. */
export async function getValidAccessToken(): Promise<string> {
  const connection = await getConnectionTokens()
  const expiresAt = new Date(connection.token_expires_at)
  const buffer = 60_000

  if (expiresAt.getTime() > Date.now() + buffer) {
    return connection.access_token
  }

  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/zoom/oauth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders,
    },
    body: JSON.stringify({
      refreshToken: connection.refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error(await getZoomErrorMessage(response, "Zoom token refresh failed"))
  }

  const tokens = await response.json()

  // Must throw if persistence fails: Zoom invalidates rotated refresh tokens,
  // so returning an unpersisted access token would force the next call to
  // refresh again with a now-dead refresh token, silently breaking the
  // integration until the workspace reconnects.
  const { error } = await supabase
    .from("zoom_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id)

  if (error) {
    throw new Error(`Failed to persist refreshed Zoom tokens: ${error.message}`)
  }

  return tokens.access_token
}

/** Exchange an authorization code for tokens. */
export async function exchangeZoomCodeForTokens(code: string, redirectUri: string) {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/zoom/oauth/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...sessionHeaders,
    },
    body: JSON.stringify({
      code,
      redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(await getZoomErrorMessage(response, "Zoom token exchange failed"))
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    userInfo: {
      zoomUserId: string
      email: string
      displayName: string
    }
  }>
}
