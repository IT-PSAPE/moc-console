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

  if (error) throw new Error(error.message)
  const row = (data ?? [])[0] as TokenRow | undefined
  return row ? mapTokenRow(row) : null
}

export async function saveIntegrationTokens(
  provider: IntegrationProvider,
  workspaceId: string,
  tokens: StoredIntegrationTokens,
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc("save_integration_oauth_tokens", {
    p_provider: provider,
    p_workspace_id: workspaceId,
    p_access_token: tokens.accessToken,
    p_refresh_token: tokens.refreshToken,
    p_token_expires_at: tokens.tokenExpiresAt,
  })

  if (error) throw new Error(error.message)
}

export async function deleteIntegrationTokens(provider: IntegrationProvider, workspaceId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.rpc("delete_integration_oauth_tokens", {
    p_provider: provider,
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)
}
