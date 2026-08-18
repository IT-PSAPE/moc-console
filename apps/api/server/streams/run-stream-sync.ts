import { errorMessage } from "../observability.js"
import {
  listUsableYouTubeConnections,
  listUsableZoomConnections,
  type UsableConnections,
  type YouTubeSyncConnection,
  type ZoomSyncConnection,
} from "./provider-connections.js"
import { sweepProvider } from "./sweep-provider.js"
import {
  emptyProviderSyncSummary,
  type ProviderSyncResult,
  type ProviderSyncSummary,
  type SyncFailure,
  type SyncProvider,
} from "./sync-summary.js"
import { syncWorkspaceYouTubeBroadcasts } from "./youtube-broadcast-sync.js"
import { syncWorkspaceZoomMeetings } from "./zoom-meeting-sync.js"

/**
 * Leaves room inside the function's configured maxDuration for the units
 * already in flight. Being killed mid-sweep is recoverable — the upserts are
 * idempotent and the deletes are evidence-gated — but reporting the truncation
 * is what makes a workspace that never gets its turn visible.
 */
const SWEEP_BUDGET_MS = 50_000

/**
 * YouTube is swept first, so it is capped at half the budget. One shared deadline
 * let a long YouTube sweep spend everything and defer every Zoom workspace, run
 * after run — and because the enumeration has no cursor, the same workspaces are
 * enumerated in the same order tomorrow. Zoom still gets whatever YouTube leaves
 * unspent, so the cap costs nothing when the run fits.
 */
const PROVIDER_BUDGET_MS = SWEEP_BUDGET_MS / 2

export type StreamSyncSummary = {
  failures: SyncFailure[]
  youtube: ProviderSyncSummary
  zoom: ProviderSyncSummary
}

export type StreamSyncDependencies = {
  listYouTubeConnections: () => Promise<UsableConnections<YouTubeSyncConnection>>
  listZoomConnections: () => Promise<UsableConnections<ZoomSyncConnection>>
  now: () => number
  syncYouTube: (connection: YouTubeSyncConnection) => Promise<ProviderSyncResult>
  syncZoom: (connection: ZoomSyncConnection) => Promise<ProviderSyncResult>
}

const productionDependencies: StreamSyncDependencies = {
  listYouTubeConnections: () => listUsableYouTubeConnections(),
  listZoomConnections: () => listUsableZoomConnections(),
  now: () => Date.now(),
  syncYouTube: (connection) => syncWorkspaceYouTubeBroadcasts(connection),
  syncZoom: (connection) => syncWorkspaceZoomMeetings(connection),
}

type Enumeration<Connection> =
  | { ok: true; usable: UsableConnections<Connection> }
  | { ok: false; error: unknown }

async function enumerateConnections<Connection>(
  list: () => Promise<UsableConnections<Connection>>,
): Promise<Enumeration<Connection>> {
  try {
    return { ok: true, usable: await list() }
  } catch (error) {
    return { ok: false, error }
  }
}

function reportEnumerationFailure(provider: SyncProvider, error: unknown, failures: SyncFailure[]): ProviderSyncSummary {
  failures.push({ provider, reason: "enumeration_failed", workspaceId: null })
  console.error(JSON.stringify({
    error: errorMessage(error),
    event: "cron.stream_sync.enumeration_failed",
    provider,
  }))
  return emptyProviderSyncSummary()
}

/**
 * Syncs YouTube broadcasts and Zoom meetings for every workspace that genuinely
 * has that provider connected. The two providers are enumerated independently,
 * so a workspace can be swept for one and skipped for the other; only losing
 * both connection lists is fatal, because then there is nothing to report.
 */
export async function runStreamSync(dependencies: StreamSyncDependencies = productionDependencies): Promise<StreamSyncSummary> {
  const startedAt = dependencies.now()
  const deadline = startedAt + SWEEP_BUDGET_MS
  const youTubeDeadline = startedAt + PROVIDER_BUDGET_MS
  const [youtube, zoom] = await Promise.all([
    enumerateConnections(dependencies.listYouTubeConnections),
    enumerateConnections(dependencies.listZoomConnections),
  ])
  if (!youtube.ok && !zoom.ok) {
    throw youtube.error instanceof Error ? youtube.error : new Error("Failed to read provider connections")
  }

  const failures: SyncFailure[] = []
  const summary: StreamSyncSummary = {
    failures,
    youtube: youtube.ok
      ? await sweepProvider("youtube", youtube.usable, dependencies.syncYouTube, youTubeDeadline, dependencies.now, failures)
      : reportEnumerationFailure("youtube", youtube.error, failures),
    zoom: zoom.ok
      ? await sweepProvider("zoom", zoom.usable, dependencies.syncZoom, deadline, dependencies.now, failures)
      : reportEnumerationFailure("zoom", zoom.error, failures),
  }
  console.info(JSON.stringify({ event: "cron.stream_sync.completed", youtube: summary.youtube, zoom: summary.zoom }))
  return summary
}
