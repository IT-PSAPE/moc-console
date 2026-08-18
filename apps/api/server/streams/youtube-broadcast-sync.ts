import { announceAdoptedEntities } from "./announce-adopted.js"
import { getDeletedBroadcastIds, getUnfinishedTrackedBroadcastIds, isCurrentOrUpcomingBroadcast } from "./broadcast-reconciliation.js"
import { toStreamUpsertRow, type StreamUpsertRow } from "./broadcast-row.js"
import type { YouTubeSyncConnection } from "./provider-connections.js"
import { emptyProviderSyncResult, type ProviderSyncResult } from "./sync-summary.js"
import { youTubeSyncStore, type YouTubeSyncDependencies } from "./youtube-sync-store.js"

/**
 * Whether the connection still authenticates as the channel the workspace
 * recorded when it connected.
 *
 * This gates deletion. A lookup by id cannot say *why* a broadcast is missing,
 * and a connection repointed at another Google account answers for a channel
 * that has never heard of any of these broadcasts — so every tracked stream
 * would look deleted at once. Anything short of a confirmed match, including a
 * failed lookup, leaves the rows alone: a stale row is a nuisance, a wrongly
 * deleted one is gone.
 *
 * The comparison only means anything because a reconnect that changes the channel
 * clears the workspace's in-flight streams itself (migration
 * 20260818130000_youtube_channel_replacement_clears_inflight_streams): the
 * reconnect rewrites `youtube_connections.channel_id`, so this check alone would
 * be comparing the new channel with itself while the old channel's rows sat there
 * waiting to be read as deleted.
 */
async function isConnectedToRecordedChannel(connection: YouTubeSyncConnection, dependencies: YouTubeSyncDependencies): Promise<boolean> {
  try {
    return await dependencies.fetchAuthenticatedChannelId(connection.workspaceId) === connection.channelId
  } catch {
    return false
  }
}

/**
 * Server-side counterpart of the console's manual sync
 * (apps/console/src/data/youtube-broadcast-sync.ts) with the same adopt,
 * reconcile and delete rules. It runs as the service role with no signed-in
 * user, so RLS scopes nothing: every read, write and delete names the workspace
 * explicitly, and deletes are additionally narrowed to ids this run produced.
 */
export async function syncWorkspaceYouTubeBroadcasts(
  connection: YouTubeSyncConnection,
  dependencies: YouTubeSyncDependencies = youTubeSyncStore,
): Promise<ProviderSyncResult> {
  const { connectedBy, workspaceId } = connection
  const result = emptyProviderSyncResult()

  const [currentBroadcasts, trackedStreams] = await Promise.all([
    dependencies.fetchCurrentBroadcasts(workspaceId),
    dependencies.readTrackedStreams(workspaceId),
  ])
  const existingCreators = new Map(trackedStreams.map((row) => [row.youtube_broadcast_id, row.created_by]))

  const unfinishedIds = getUnfinishedTrackedBroadcastIds(trackedStreams, currentBroadcasts.map((broadcast) => broadcast.id))
  const lookedUpBroadcasts = unfinishedIds.length > 0 ? await dependencies.fetchBroadcastsByIds(workspaceId, unfinishedIds) : []
  const deletedIds = getDeletedBroadcastIds(unfinishedIds, lookedUpBroadcasts.map((broadcast) => broadcast.id))

  const now = dependencies.now()
  // Keyed by broadcast id: one upsert may not touch the same row twice, and the
  // same broadcast can surface in more than one list.
  const payloads = new Map<string, StreamUpsertRow>()
  const adoptedBroadcastIds = new Set<string>()
  for (const broadcast of [...currentBroadcasts, ...lookedUpBroadcasts]) {
    // An existing row keeps its author: the cron has no authenticated user and
    // must never rewrite authorship on a reconcile. A newly adopted row is
    // credited to whoever authorised the integration, which is durable.
    const row = toStreamUpsertRow(broadcast, workspaceId, existingCreators.get(broadcast.id) ?? connectedBy)
    // A stream already tracked is always reconciled, so its status and end time
    // stay accurate once it goes live and finishes. One not tracked is only
    // taken on while it is current or upcoming.
    if (existingCreators.has(broadcast.id)) {
      payloads.set(broadcast.id, row)
    } else if (isCurrentOrUpcomingBroadcast(row, now)) {
      payloads.set(broadcast.id, row)
      adoptedBroadcastIds.add(broadcast.id)
    }
  }
  if (payloads.size > 0) await dependencies.upsertStreams([...payloads.values()])
  result.adopted = adoptedBroadcastIds.size
  result.reconciled = payloads.size - adoptedBroadcastIds.size

  // A stream still in flight that no longer exists on YouTube was deleted
  // there. Streams already recorded as finished are never looked up and so are
  // never candidates: they stay as history.
  if (deletedIds.length > 0 && await isConnectedToRecordedChannel(connection, dependencies)) {
    await dependencies.deleteStreams(workspaceId, deletedIds)
    result.deleted = deletedIds.length
  }

  if (adoptedBroadcastIds.size > 0) {
    const adoptedRows = await dependencies.readAdoptedStreams(workspaceId, [...adoptedBroadcastIds])
    await announceAdoptedEntities("youtube", workspaceId, adoptedRows, (row) => dependencies.announceStream(workspaceId, row), result)
  }
  return result
}
