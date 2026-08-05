import {
  getIntegrationTokens,
  saveIntegrationTokens,
  type IntegrationProvider,
  type StoredIntegrationTokens,
} from "./integration-oauth-store.js"
import { getSupabaseAdmin } from "./supabase-admin.js"
import { refreshYouTubeToken, resolveYouTubeOAuthConfig, YouTubeReauthRequiredError } from "./youtube-oauth.js"
import { refreshZoomToken, resolveZoomOAuthConfig } from "./zoom-oauth.js"

const REFRESH_BUFFER_MS = 60_000

export class IntegrationNotConnectedError extends Error {
  constructor(provider: IntegrationProvider) {
    super(`${provider === "youtube" ? "YouTube" : "Zoom"} is not connected for this workspace`)
    this.name = "IntegrationNotConnectedError"
  }
}

export { YouTubeReauthRequiredError }

async function syncPublicExpiry(provider: IntegrationProvider, workspaceId: string, tokenExpiresAt: string): Promise<void> {
  const table = provider === "youtube" ? "youtube_connections" : "zoom_connections"
  const { error } = await getSupabaseAdmin()
    .from(table)
    .update({ token_expires_at: tokenExpiresAt })
    .eq("workspace_id", workspaceId)
  if (error) console.error(`Unable to update ${provider} connection expiry metadata:`, error)
}

async function refreshYouTube(workspaceId: string, current: StoredIntegrationTokens): Promise<string> {
  let tokens: Awaited<ReturnType<typeof refreshYouTubeToken>>
  try {
    tokens = await refreshYouTubeToken(resolveYouTubeOAuthConfig(process.env), current.refreshToken)
  } catch (error) {
    if (error instanceof YouTubeReauthRequiredError) {
      const { error: updateError } = await getSupabaseAdmin()
        .from("youtube_connections")
        .update({ status: "reauth_required" })
        .eq("workspace_id", workspaceId)
      if (updateError) console.error("Unable to record YouTube reauth state:", updateError)
    }
    throw error
  }
  const next = {
    accessToken: tokens.access_token,
    refreshToken: current.refreshToken,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }
  await saveIntegrationTokens("youtube", workspaceId, next)
  await syncPublicExpiry("youtube", workspaceId, next.tokenExpiresAt)
  return next.accessToken
}

async function refreshZoom(workspaceId: string, current: StoredIntegrationTokens): Promise<string> {
  const tokens = await refreshZoomToken(resolveZoomOAuthConfig(process.env), current.refreshToken)
  const next = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }
  await saveIntegrationTokens("zoom", workspaceId, next)
  await syncPublicExpiry("zoom", workspaceId, next.tokenExpiresAt)
  return next.accessToken
}

export async function getIntegrationAccessToken(provider: IntegrationProvider, workspaceId: string): Promise<string> {
  const current = await getIntegrationTokens(provider, workspaceId)
  if (!current) throw new IntegrationNotConnectedError(provider)

  if (new Date(current.tokenExpiresAt).getTime() > Date.now() + REFRESH_BUFFER_MS) {
    return current.accessToken
  }

  return provider === "youtube"
    ? refreshYouTube(workspaceId, current)
    : refreshZoom(workspaceId, current)
}
