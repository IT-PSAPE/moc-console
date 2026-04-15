import { supabase } from "./supabase"
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

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string }
    return data.error ?? fallback
  }

  const text = await response.text()
  return text || fallback
}

/** Returns a valid access token, refreshing if expired. */
async function getValidAccessToken(): Promise<string> {
  const connection = await getConnectionTokens()
  const expiresAt = new Date(connection.token_expires_at)
  const buffer = 60_000

  if (expiresAt.getTime() > Date.now() + buffer) {
    return connection.access_token
  }

  const response = await fetch("/api/zoom/oauth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: connection.refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Zoom token refresh failed"))
  }

  const tokens = await response.json()

  await supabase
    .from("zoom_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id)

  return tokens.access_token
}

/** Exchange an authorization code for tokens. */
export async function exchangeZoomCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch("/api/zoom/oauth/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Zoom token exchange failed"))
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

/** Make an authenticated Zoom API call. Handles token refresh automatically. */
export async function zoomApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getValidAccessToken()
  const url = path.startsWith("http") ? path : `/api/zoom/v2${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

/** Revoke Zoom OAuth token. */
export async function revokeZoomToken(accessToken: string): Promise<void> {
  const response = await fetch("/api/zoom/oauth/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: accessToken }),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Zoom token revoke failed"))
  }
}
