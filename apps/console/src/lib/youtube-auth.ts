import { supabase } from "@moc/data/supabase"
import { buildSessionHeaders } from "./api-auth"
import { getCurrentWorkspaceId } from "@/data/current-workspace"

type ConnectionTokens = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

/**
 * The stored refresh token is permanently dead (Google returned
 * invalid_grant). The connection row has been flagged reauth_required;
 * the user must reconnect YouTube. Distinct from transient refresh
 * failures so the UI can prompt a reconnect rather than a generic retry.
 */
export class YouTubeReauthRequiredError extends Error {
  constructor(message = "YouTube disconnected — reconnect to resume YouTube operations") {
    super(message)
    this.name = "YouTubeReauthRequiredError"
  }
}

async function getJsonError(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string }
    return data.error ?? fallback
  }
  return fallback
}

async function getConnectionTokens(): Promise<ConnectionTokens> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !data) {
    throw new Error("YouTube is not connected for this workspace")
  }

  return data as ConnectionTokens
}

export async function getValidAccessToken(): Promise<string> {
  const connection = await getConnectionTokens()
  const expiresAt = new Date(connection.token_expires_at)
  const buffer = 60_000

  if (expiresAt.getTime() > Date.now() + buffer) {
    return connection.access_token
  }

  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/youtube/oauth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ refreshToken: connection.refresh_token }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      const body = await response.json().catch(() => ({})) as { error?: string; code?: string }
      if (body.code === "reauth_required") {
        // Refresh token is dead. Persist the health flag (best-effort:
        // blocked silently for can_read-only members, which is fine —
        // the throw below still prevents the operation) so the UI can
        // surface the reconnect banner and disable YouTube actions.
        await supabase
          .from("youtube_connections")
          .update({ status: "reauth_required" })
          .eq("id", connection.id)
        throw new YouTubeReauthRequiredError(body.error)
      }
    }
    throw new Error(await getJsonError(response, "YouTube token refresh failed"))
  }

  const tokens = await response.json() as { access_token: string; expires_in: number }

  await supabase
    .from("youtube_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id)

  return tokens.access_token
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/youtube/oauth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ code, redirectUri }),
  })

  if (!response.ok) {
    throw new Error(await getJsonError(response, "YouTube token exchange failed"))
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    channel: { channelId: string; channelTitle: string }
  }>
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}
