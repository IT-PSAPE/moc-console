import { getSupabaseAdmin } from "./supabase-admin.js"

export type IntegrationProvider = "youtube" | "zoom"

type TokenRow = {
  access_token: string
  refresh_token: string
  token_expires_at: string
}

export type StoredIntegrationTokens = {
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string
}

type YouTubeConnectionMetadata = {
  channelId: string
  channelTitle: string
  connectedBy: string
}

type ZoomConnectionMetadata = {
  zoomUserId: string
  email: string
  displayName: string
  connectedBy: string
}

export type IntegrationConnectionMetadata =
  | { provider: "youtube"; connection: YouTubeConnectionMetadata }
  | { provider: "zoom"; connection: ZoomConnectionMetadata }

export class IntegrationStoreError extends Error {
  constructor() {
    super("Integration credentials are temporarily unavailable")
    this.name = "IntegrationStoreError"
  }
}

function mapTokenRow(row: TokenRow): StoredIntegrationTokens {
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
  }
}

export async function getIntegrationTokens(provider: IntegrationProvider, workspaceId: string): Promise<StoredIntegrationTokens | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc("get_integration_oauth_tokens", {
    p_provider: provider,
    p_workspace_id: workspaceId,
  })

  if (error) throw new IntegrationStoreError()
  const row = (data ?? [])[0] as TokenRow | undefined
  return row ? mapTokenRow(row) : null
}

export async function deleteIntegrationConnection(provider: IntegrationProvider, workspaceId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_integration_oauth_connection", {
    p_provider: provider,
    p_workspace_id: workspaceId,
  })

  if (error) throw new IntegrationStoreError()
}

/**
 * Processes Zoom's Marketplace deauthorization event. The RPC deletes every
 * workspace connection for the deauthorized Zoom user, its private tokens,
 * and the meeting metadata fetched through that connection.
 */
export async function deleteZoomIntegrationsForUser(zoomUserId: string): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("delete_zoom_integrations_for_user", {
    p_zoom_user_id: zoomUserId,
  })

  if (error) throw new IntegrationStoreError()
}

/**
 * Saves the provider-facing connection metadata and private OAuth credentials
 * in one database transaction. The RPC deliberately owns both writes: doing
 * them from separate API calls can leave a workspace looking connected without
 * usable credentials.
 */
export async function saveIntegrationConnection(
  workspaceId: string,
  metadata: IntegrationConnectionMetadata,
  tokens: StoredIntegrationTokens,
): Promise<void> {
  const { provider, connection } = metadata
  const { error } = await getSupabaseAdmin().rpc("save_integration_oauth_connection", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_access_token: tokens.accessToken,
    p_refresh_token: tokens.refreshToken,
    p_token_expires_at: tokens.tokenExpiresAt,
    p_connection: provider === "youtube"
      ? {
          channel_id: connection.channelId,
          channel_title: connection.channelTitle,
          status: "active",
          connected_by: connection.connectedBy,
        }
      : {
          zoom_user_id: connection.zoomUserId,
          email: connection.email,
          display_name: connection.displayName,
          status: "active",
          connected_by: connection.connectedBy,
        },
  })

  if (error) throw new IntegrationStoreError()
}

export async function tryAcquireIntegrationRefreshLock(
  provider: IntegrationProvider,
  workspaceId: string,
  expectedRefreshToken: string,
  lockId: string,
  lockExpiresAt: string,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("try_acquire_integration_oauth_refresh_lock", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_expected_refresh_token: expectedRefreshToken,
    p_lock_id: lockId,
    p_lock_expires_at: lockExpiresAt,
  })

  if (error) throw new IntegrationStoreError()
  return data === true
}

export async function completeIntegrationTokenRefresh(
  provider: IntegrationProvider,
  workspaceId: string,
  expectedRefreshToken: string,
  lockId: string,
  tokens: StoredIntegrationTokens,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("complete_integration_oauth_token_refresh", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_expected_refresh_token: expectedRefreshToken,
    p_lock_id: lockId,
    p_access_token: tokens.accessToken,
    p_refresh_token: tokens.refreshToken,
    p_token_expires_at: tokens.tokenExpiresAt,
  })

  if (error) throw new IntegrationStoreError()
  return data === true
}

/**
 * Atomically compares the private refresh token and records a durable public
 * reconnect state. Keeping both operations in one RPC prevents a concurrent
 * token rotation from incorrectly staling an active connection.
 */
export async function markIntegrationReauthRequiredIfRefreshTokenMatches(
  provider: IntegrationProvider,
  workspaceId: string,
  expectedRefreshToken: string,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin().rpc("mark_integration_oauth_reauth_required_if_refresh_token_matches", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_expected_refresh_token: expectedRefreshToken,
  })

  if (error) throw new IntegrationStoreError()
  return data === true
}

export async function releaseIntegrationRefreshLock(
  provider: IntegrationProvider,
  workspaceId: string,
  lockId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc("release_integration_oauth_refresh_lock", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_lock_id: lockId,
  })

  if (error) throw new IntegrationStoreError()
}
