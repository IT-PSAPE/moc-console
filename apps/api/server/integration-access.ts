import { randomUUID } from "node:crypto"

import {
  completeIntegrationTokenRefresh,
  getIntegrationTokens,
  markIntegrationReauthRequiredIfRefreshTokenMatches,
  releaseIntegrationRefreshLock,
  tryAcquireIntegrationRefreshLock,
  type IntegrationProvider,
  type StoredIntegrationTokens,
} from "./integration-oauth-store.js"
import { getSupabaseAdmin } from "./supabase-admin.js"
import { refreshYouTubeToken, resolveYouTubeOAuthConfig, YouTubeReauthRequiredError } from "./youtube-oauth.js"
import { refreshZoomToken, resolveZoomOAuthConfig, ZoomReauthRequiredError } from "./zoom-oauth.js"

const REFRESH_BUFFER_MS = 60_000
const REFRESH_LOCK_MS = 20_000
const REFRESH_WAIT_MS = 150
const REFRESH_WAIT_TIMEOUT_MS = 22_000

export class IntegrationNotConnectedError extends Error {
  constructor(provider: IntegrationProvider) {
    super(`${provider === "youtube" ? "YouTube" : "Zoom"} is not connected for this workspace`)
    this.name = "IntegrationNotConnectedError"
  }
}

export { YouTubeReauthRequiredError, ZoomReauthRequiredError }

type GetIntegrationAccessTokenOptions = {
  forceRefresh?: boolean
}

function isAccessTokenCurrent(tokens: StoredIntegrationTokens): boolean {
  return new Date(tokens.tokenExpiresAt).getTime() > Date.now() + REFRESH_BUFFER_MS
}

function connectionTable(provider: IntegrationProvider): "youtube_connections" | "zoom_connections" {
  return provider === "youtube" ? "youtube_connections" : "zoom_connections"
}

async function syncPublicConnection(provider: IntegrationProvider, workspaceId: string, tokenExpiresAt: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(connectionTable(provider))
    .update({ status: "active", token_expires_at: tokenExpiresAt })
    .eq("workspace_id", workspaceId)
  if (error) console.error(`Unable to update ${provider} connection metadata:`, error)
}

export type IntegrationReauthDependencies = {
  getIntegrationTokens: (provider: IntegrationProvider, workspaceId: string) => Promise<StoredIntegrationTokens | null>
  markIntegrationReauthRequiredIfRefreshTokenMatches: (
    provider: IntegrationProvider,
    workspaceId: string,
    expectedRefreshToken: string,
  ) => Promise<boolean>
}

const productionReauthDependencies: IntegrationReauthDependencies = {
  getIntegrationTokens,
  markIntegrationReauthRequiredIfRefreshTokenMatches,
}

/**
 * The store performs the private-token comparison and public status update in
 * one database transaction, closing the refresh-token TOCTOU window.
 */
export async function markIntegrationReauthRequiredIfRefreshTokenCurrent(
  provider: IntegrationProvider,
  workspaceId: string,
  rejectedRefreshToken: string,
  dependencies: IntegrationReauthDependencies = productionReauthDependencies,
): Promise<boolean> {
  return dependencies.markIntegrationReauthRequiredIfRefreshTokenMatches(provider, workspaceId, rejectedRefreshToken)
}

/**
 * Records reauthentication only when the credentials used by the caller are
 * still the stored credentials at the database boundary.
 */
export async function markIntegrationReauthRequiredForStoredToken(
  provider: IntegrationProvider,
  workspaceId: string,
  failedAccessToken: string,
  dependencies: IntegrationReauthDependencies = productionReauthDependencies,
): Promise<boolean> {
  const current = await dependencies.getIntegrationTokens(provider, workspaceId)
  if (!current || current.accessToken !== failedAccessToken) return false
  return markIntegrationReauthRequiredIfRefreshTokenCurrent(provider, workspaceId, current.refreshToken, dependencies)
}

async function refreshProviderToken(provider: IntegrationProvider, refreshToken: string): Promise<StoredIntegrationTokens> {
  if (provider === "youtube") {
    const tokens = await refreshYouTubeToken(resolveYouTubeOAuthConfig(process.env), refreshToken)
    return {
      accessToken: tokens.access_token,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }
  }

  const tokens = await refreshZoomToken(resolveZoomOAuthConfig(process.env), refreshToken)
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function waitForRefresh(
  provider: IntegrationProvider,
  workspaceId: string,
  previous: StoredIntegrationTokens,
): Promise<string | null> {
  const deadline = Date.now() + REFRESH_WAIT_TIMEOUT_MS
  while (Date.now() < deadline) {
    await wait(REFRESH_WAIT_MS)
    const current = await getIntegrationTokens(provider, workspaceId)
    if (!current) throw new IntegrationNotConnectedError(provider)
    const refreshed = current.accessToken !== previous.accessToken
      || current.refreshToken !== previous.refreshToken
      || current.tokenExpiresAt !== previous.tokenExpiresAt
    if (refreshed && isAccessTokenCurrent(current)) {
      return current.accessToken
    }
  }
  return null
}

async function refreshIntegrationAccessToken(
  provider: IntegrationProvider,
  workspaceId: string,
  forceRefresh: boolean,
): Promise<string> {
  for (;;) {
    const current = await getIntegrationTokens(provider, workspaceId)
    if (!current) throw new IntegrationNotConnectedError(provider)
    if (!forceRefresh && isAccessTokenCurrent(current)) return current.accessToken

    const lockId = randomUUID()
    const acquired = await tryAcquireIntegrationRefreshLock(
      provider,
      workspaceId,
      current.refreshToken,
      lockId,
      new Date(Date.now() + REFRESH_LOCK_MS).toISOString(),
    )

    if (!acquired) {
      const refreshedAccessToken = await waitForRefresh(provider, workspaceId, current)
      if (refreshedAccessToken) return refreshedAccessToken
      forceRefresh = false
      continue
    }

    let complete = false
    try {
      const next = await refreshProviderToken(provider, current.refreshToken)
      complete = await completeIntegrationTokenRefresh(provider, workspaceId, current.refreshToken, lockId, next)
      if (!complete) {
        forceRefresh = false
        continue
      }
      await syncPublicConnection(provider, workspaceId, next.tokenExpiresAt)
      return next.accessToken
    } catch (error) {
      if (error instanceof YouTubeReauthRequiredError || error instanceof ZoomReauthRequiredError) {
        const reauthMarked = await markIntegrationReauthRequiredIfRefreshTokenCurrent(
          provider,
          workspaceId,
          current.refreshToken,
        )
        // An expired lease let another worker rotate the token first. Restart
        // from storage so this request can use that worker's valid credentials
        // instead of surfacing a false reconnect requirement.
        if (!reauthMarked) {
          forceRefresh = false
          continue
        }
      }
      throw error
    } finally {
      if (!complete) {
        try {
          await releaseIntegrationRefreshLock(provider, workspaceId, lockId)
        } catch (error) {
          console.error(`Unable to release ${provider} token refresh lock:`, error)
        }
      }
    }
  }
}

export async function getIntegrationAccessToken(
  provider: IntegrationProvider,
  workspaceId: string,
  { forceRefresh = false }: GetIntegrationAccessTokenOptions = {},
): Promise<string> {
  const current = await getIntegrationTokens(provider, workspaceId)
  if (!current) throw new IntegrationNotConnectedError(provider)
  if (!forceRefresh && isAccessTokenCurrent(current)) return current.accessToken

  return refreshIntegrationAccessToken(provider, workspaceId, forceRefresh)
}
