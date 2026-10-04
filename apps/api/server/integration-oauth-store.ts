import type { QueryResultRow, PoolClient } from "pg"
import { queryRows, withActor } from "@moc/backend/database"

export type IntegrationProvider = "youtube" | "zoom"

type TokenRow = QueryResultRow & {
  access_token: string
  refresh_token: string
  token_expires_at: Date | string
}

export type StoredIntegrationTokens = {
  accessToken: string
  refreshToken: string
  tokenExpiresAt: string
}

type YouTubeConnectionMetadata = { channelId: string; channelTitle: string; connectedBy: string }
type ZoomConnectionMetadata = { zoomUserId: string; email: string; displayName: string; connectedBy: string }
export type IntegrationConnectionMetadata =
  | { provider: "youtube"; connection: YouTubeConnectionMetadata }
  | { provider: "zoom"; connection: ZoomConnectionMetadata }

export class IntegrationStoreError extends Error {
  constructor() {
    super("Integration credentials are temporarily unavailable")
    this.name = "IntegrationStoreError"
  }
}

function worker<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  return withActor({ userId: null, workspaceId: null, role: "moc_worker" }, work)
}

function mapTokenRow(row: TokenRow): StoredIntegrationTokens {
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at instanceof Date ? row.token_expires_at.toISOString() : row.token_expires_at,
  }
}

export async function getIntegrationTokens(provider: IntegrationProvider, workspaceId: string): Promise<StoredIntegrationTokens | null> {
  try {
    const [row] = await queryRows<TokenRow>(
      `SELECT access_token, refresh_token, token_expires_at FROM moc_private.integration_oauth_tokens
       WHERE provider = $1 AND workspace_id = $2`, [provider, workspaceId],
    )
    return row ? mapTokenRow(row) : null
  } catch {
    throw new IntegrationStoreError()
  }
}

async function cleanupZoomRows(client: PoolClient, workspaceIds: string[]): Promise<void> {
  if (workspaceIds.length === 0) return
  await client.query(
    `DELETE FROM public.notification_deliveries delivery USING public.zoom_meetings meeting
     WHERE meeting.workspace_id = ANY($1::uuid[]) AND delivery.event_key = format('meeting.created:%s', meeting.id)`, [workspaceIds],
  )
  await client.query(
    `DELETE FROM public.notification_outbox outbox USING public.zoom_meetings meeting
     WHERE meeting.workspace_id = ANY($1::uuid[]) AND outbox.event_type='meeting.created'
       AND outbox.entity_type='meeting' AND outbox.entity_id=meeting.id
       AND outbox.event_key=format('meeting.created:%s', meeting.id)`, [workspaceIds],
  )
  await client.query("DELETE FROM public.zoom_meetings WHERE workspace_id = ANY($1::uuid[])", [workspaceIds])
}

export async function deleteIntegrationConnection(provider: IntegrationProvider, workspaceId: string): Promise<void> {
  try {
    await worker(async (client) => {
      if (provider === "zoom") {
        await client.query("SELECT 1 FROM public.zoom_connections WHERE workspace_id=$1 FOR UPDATE", [workspaceId])
        await cleanupZoomRows(client, [workspaceId])
      }
      await client.query("DELETE FROM moc_private.integration_oauth_tokens WHERE provider=$1 AND workspace_id=$2", [provider, workspaceId])
      await client.query(`DELETE FROM public.${provider === "youtube" ? "youtube_connections" : "zoom_connections"} WHERE workspace_id=$1`, [workspaceId])
    })
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function deleteZoomIntegrationsForUser(zoomUserId: string): Promise<void> {
  try {
    await worker(async (client) => {
      const { rows } = await client.query<QueryResultRow & { workspace_id: string }>(
        "SELECT workspace_id FROM public.zoom_connections WHERE zoom_user_id=$1 FOR UPDATE", [zoomUserId],
      )
      const workspaceIds = rows.map((row) => row.workspace_id)
      await cleanupZoomRows(client, workspaceIds)
      if (workspaceIds.length > 0) {
        await client.query("DELETE FROM moc_private.integration_oauth_tokens WHERE provider='zoom' AND workspace_id=ANY($1::uuid[])", [workspaceIds])
      }
      await client.query("DELETE FROM public.zoom_connections WHERE zoom_user_id=$1", [zoomUserId])
    })
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function saveIntegrationConnection(workspaceId: string, metadata: IntegrationConnectionMetadata, tokens: StoredIntegrationTokens): Promise<void> {
  const { provider, connection } = metadata
  try {
    await worker(async (client) => {
      if (provider === "zoom") {
        const { rows } = await client.query<QueryResultRow & { zoom_user_id: string }>(
          "SELECT zoom_user_id FROM public.zoom_connections WHERE workspace_id=$1 FOR UPDATE", [workspaceId],
        )
        if (rows[0] && rows[0].zoom_user_id !== connection.zoomUserId) await client.query("DELETE FROM public.zoom_connections WHERE workspace_id=$1", [workspaceId])
      }
      await client.query(
        `INSERT INTO moc_private.integration_oauth_tokens(provider,workspace_id,access_token,refresh_token,token_expires_at,refresh_lock_id,refresh_lock_expires_at)
         VALUES($1,$2,$3,$4,$5,NULL,NULL) ON CONFLICT(provider,workspace_id) DO UPDATE SET access_token=EXCLUDED.access_token,
         refresh_token=EXCLUDED.refresh_token,token_expires_at=EXCLUDED.token_expires_at,refresh_lock_id=NULL,
         refresh_lock_expires_at=NULL,updated_at=now()`,
        [provider, workspaceId, tokens.accessToken, tokens.refreshToken, tokens.tokenExpiresAt],
      )
      if (provider === "youtube") {
        await client.query(
          `INSERT INTO public.youtube_connections(workspace_id,channel_id,channel_title,token_expires_at,status,connected_by)
           VALUES($1,$2,$3,$4,'active',$5) ON CONFLICT(workspace_id) DO UPDATE SET channel_id=EXCLUDED.channel_id,
           channel_title=EXCLUDED.channel_title,token_expires_at=EXCLUDED.token_expires_at,status='active',connected_by=EXCLUDED.connected_by`,
          [workspaceId, connection.channelId, connection.channelTitle, tokens.tokenExpiresAt, connection.connectedBy],
        )
      } else {
        await client.query(
          `INSERT INTO public.zoom_connections(workspace_id,zoom_user_id,email,display_name,token_expires_at,status,connected_by)
           VALUES($1,$2,$3,$4,$5,'active',$6) ON CONFLICT(workspace_id) DO UPDATE SET zoom_user_id=EXCLUDED.zoom_user_id,
           email=EXCLUDED.email,display_name=EXCLUDED.display_name,token_expires_at=EXCLUDED.token_expires_at,status='active',
           connected_by=EXCLUDED.connected_by`,
          [workspaceId, connection.zoomUserId, connection.email, connection.displayName, tokens.tokenExpiresAt, connection.connectedBy],
        )
      }
    })
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function tryAcquireIntegrationRefreshLock(provider: IntegrationProvider, workspaceId: string, expectedRefreshToken: string, lockId: string, lockExpiresAt: string): Promise<boolean> {
  try {
    const result = await queryRows<QueryResultRow & { refresh_lock_id: string }>(
      `UPDATE moc_private.integration_oauth_tokens SET refresh_lock_id=$4,refresh_lock_expires_at=$5,updated_at=now()
       WHERE provider=$1 AND workspace_id=$2 AND refresh_token=$3
         AND (refresh_lock_expires_at IS NULL OR refresh_lock_expires_at <= now()) RETURNING refresh_lock_id`,
      [provider, workspaceId, expectedRefreshToken, lockId, lockExpiresAt],
    )
    return result[0]?.refresh_lock_id === lockId
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function completeIntegrationTokenRefresh(provider: IntegrationProvider, workspaceId: string, expectedRefreshToken: string, lockId: string, tokens: StoredIntegrationTokens): Promise<boolean> {
  try {
    const result = await queryRows<QueryResultRow & { refresh_token: string }>(
      `UPDATE moc_private.integration_oauth_tokens SET access_token=$5,refresh_token=$6,token_expires_at=$7,
       refresh_lock_id=NULL,refresh_lock_expires_at=NULL,updated_at=now()
       WHERE provider=$1 AND workspace_id=$2 AND refresh_token=$3 AND refresh_lock_id=$4
         AND refresh_lock_expires_at > now() RETURNING refresh_token`,
      [provider, workspaceId, expectedRefreshToken, lockId, tokens.accessToken, tokens.refreshToken, tokens.tokenExpiresAt],
    )
    return result.length > 0
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function markIntegrationReauthRequiredIfRefreshTokenMatches(provider: IntegrationProvider, workspaceId: string, expectedRefreshToken: string): Promise<boolean> {
  try {
    return await worker(async (client) => {
      if (provider === "youtube") {
        const token = await client.query("SELECT 1 FROM moc_private.integration_oauth_tokens WHERE provider=$1 AND workspace_id=$2 AND refresh_token=$3 FOR UPDATE", [provider, workspaceId, expectedRefreshToken])
        if (token.rowCount === 0) return false
        const result = await client.query("UPDATE public.youtube_connections SET status='reauth_required' WHERE workspace_id=$1", [workspaceId])
        return (result.rowCount ?? 0) > 0
      }
      const connection = await client.query("SELECT 1 FROM public.zoom_connections WHERE workspace_id=$1 FOR UPDATE", [workspaceId])
      if (connection.rowCount === 0) return false
      const token = await client.query("SELECT 1 FROM moc_private.integration_oauth_tokens WHERE provider=$1 AND workspace_id=$2 AND refresh_token=$3 FOR UPDATE", [provider, workspaceId, expectedRefreshToken])
      if (token.rowCount === 0) return false
      await client.query("UPDATE public.zoom_connections SET status='reauth_required' WHERE workspace_id=$1", [workspaceId])
      return true
    })
  } catch {
    throw new IntegrationStoreError()
  }
}

export async function releaseIntegrationRefreshLock(provider: IntegrationProvider, workspaceId: string, lockId: string): Promise<void> {
  try {
    await queryRows(
      `UPDATE moc_private.integration_oauth_tokens SET refresh_lock_id=NULL,refresh_lock_expires_at=NULL,updated_at=now()
       WHERE provider=$1 AND workspace_id=$2 AND refresh_lock_id=$3`, [provider, workspaceId, lockId],
    )
  } catch {
    throw new IntegrationStoreError()
  }
}
