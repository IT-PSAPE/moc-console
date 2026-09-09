import { getIntegrationTokens } from "../integration-oauth-store.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { classifySyncFailure, type SyncFailureReason } from "./sync-failure.js"

type ActiveConnectionRow = {
  connected_by: string
  workspace_id: string
}

type YouTubeConnectionRow = ActiveConnectionRow & { channel_id: string }
type ZoomConnectionRow = ActiveConnectionRow & { id: string }

export type YouTubeSyncConnection = {
  channelId: string
  connectedBy: string
  workspaceId: string
}

export type ZoomSyncConnection = {
  connectedBy: string
  workspaceId: string
  zoomConnectionId: string
}

export type ConnectionSkip = {
  reason: "credentials_missing"
  workspaceId: string
}

export type ConnectionFailure = {
  reason: SyncFailureReason
  workspaceId: string
}

export type UsableConnections<Connection> = {
  connections: Connection[]
  failures: ConnectionFailure[]
  skipped: ConnectionSkip[]
}

export type ConnectionGateDependencies<Row> = {
  hasStoredCredentials: (workspaceId: string) => Promise<boolean>
  readActiveConnections: () => Promise<Row[]>
}

/**
 * Only `active` connections are candidates. `public.youtube_connection_status`
 * has exactly two values, so filtering on it is both the allow-list and the
 * skip-list: a workspace mid-reconnect drops out here and never appears as a
 * failure.
 *
 * Stored credentials are then probed before any provider request, because the
 * token RPC ignores the public status and a public row can outlive its private
 * credentials. Without the probe the first YouTube call would spend quota, and
 * the token resolver would enter its lock-and-refresh path, for a connection
 * that cannot succeed. The probe is a probe only — the proxies resolve and
 * refresh their own tokens, so nothing is threaded through from here.
 */
async function collectUsableConnections<Row extends ActiveConnectionRow, Connection>(
  dependencies: ConnectionGateDependencies<Row>,
  toConnection: (row: Row) => Connection,
): Promise<UsableConnections<Connection>> {
  const usable: UsableConnections<Connection> = { connections: [], failures: [], skipped: [] }

  for (const row of await dependencies.readActiveConnections()) {
    try {
      if (await dependencies.hasStoredCredentials(row.workspace_id)) {
        usable.connections.push(toConnection(row))
      } else {
        usable.skipped.push({ reason: "credentials_missing", workspaceId: row.workspace_id })
      }
    } catch (error) {
      usable.failures.push({ reason: classifySyncFailure(error).reason, workspaceId: row.workspace_id })
    }
  }

  return usable
}

/**
 * The slice of the admin client the readers below use. Injectable so the
 * `status = 'active'` filter — the one thing keeping a workspace mid-reconnect
 * out of the sweep — is asserted rather than assumed.
 */
export type ConnectionTableReader = (table: string) => {
  select: (columns: string) => {
    eq: (column: string, value: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>
  }
}

const supabaseTable: ConnectionTableReader = (table) => ({
  select: (columns) => ({
    eq: async (column, value) => await getSupabaseAdmin().from(table).select(columns).eq(column, value),
  }),
})

async function readActiveConnectionRows<Row>(from: ConnectionTableReader, table: string, columns: string): Promise<Row[]> {
  const { data, error } = await from(table).select(columns).eq("status", "active")
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}

export function readActiveYouTubeConnections(from: ConnectionTableReader = supabaseTable): Promise<YouTubeConnectionRow[]> {
  return readActiveConnectionRows(from, "youtube_connections", "workspace_id, channel_id, connected_by")
}

export function readActiveZoomConnections(from: ConnectionTableReader = supabaseTable): Promise<ZoomConnectionRow[]> {
  return readActiveConnectionRows(from, "zoom_connections", "workspace_id, id, connected_by")
}

const youTubeConnectionGate: ConnectionGateDependencies<YouTubeConnectionRow> = {
  hasStoredCredentials: async (workspaceId) => (await getIntegrationTokens("youtube", workspaceId)) !== null,
  readActiveConnections: () => readActiveYouTubeConnections(),
}

const zoomConnectionGate: ConnectionGateDependencies<ZoomConnectionRow> = {
  hasStoredCredentials: async (workspaceId) => (await getIntegrationTokens("zoom", workspaceId)) !== null,
  readActiveConnections: () => readActiveZoomConnections(),
}

export function listUsableYouTubeConnections(
  dependencies: ConnectionGateDependencies<YouTubeConnectionRow> = youTubeConnectionGate,
): Promise<UsableConnections<YouTubeSyncConnection>> {
  return collectUsableConnections(dependencies, (row) => ({
    channelId: row.channel_id,
    connectedBy: row.connected_by,
    workspaceId: row.workspace_id,
  }))
}

export function listUsableZoomConnections(
  dependencies: ConnectionGateDependencies<ZoomConnectionRow> = zoomConnectionGate,
): Promise<UsableConnections<ZoomSyncConnection>> {
  return collectUsableConnections(dependencies, (row) => ({
    connectedBy: row.connected_by,
    workspaceId: row.workspace_id,
    zoomConnectionId: row.id,
  }))
}
