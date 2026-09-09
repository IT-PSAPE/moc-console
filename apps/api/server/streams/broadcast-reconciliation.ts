/**
 * Mirrors apps/console/src/data/youtube-broadcast-reconciliation.ts. The
 * console's copy lives in the Vite app beside browser-only modules and depends
 * on @moc/types, which exports raw TypeScript that a Vercel function cannot
 * resolve at runtime (see packages/notifications/tsconfig.json for the same
 * constraint). These predicates are the contract that keeps a finished
 * broadcast from being adopted — and announced — a second time, so the port is
 * kept behaviour-identical and covered by the same cases as the console's.
 */

export type StreamStatus = "created" | "ready" | "live" | "complete"

/** The local view of a stream the workspace already tracks. */
export type StreamReconciliationRow = {
  youtube_broadcast_id: string
  stream_status: StreamStatus
  actual_end_time: string | null
}

/** The fields that decide whether an untracked broadcast is worth adopting. */
export type BroadcastAdoptionRow = {
  stream_status: StreamStatus
  scheduled_start_time: string | null
  actual_end_time: string | null
}

/**
 * A broadcast scheduled slightly in the past is still worth adopting: it is
 * about to be started, or it started a moment ago and YouTube has not moved it
 * out of `upcoming` yet.
 */
const SCHEDULE_GRACE_MS = 60 * 60_000

/**
 * YouTube keeps every broadcast a channel has ever created, so a sweep also
 * sees streams that finished months ago and ones that were scheduled and never
 * started — both arrive in the `upcoming` list indefinitely. A broadcast only
 * becomes a new stream while it is on air or still to come.
 */
export function isCurrentOrUpcomingBroadcast(row: BroadcastAdoptionRow, now = new Date()): boolean {
  if (row.stream_status === "live") return true
  if (row.stream_status === "complete" || row.actual_end_time) return false
  if (!row.scheduled_start_time) return false

  const scheduledAt = Date.parse(row.scheduled_start_time)
  return Number.isFinite(scheduledAt) && scheduledAt > now.getTime() - SCHEDULE_GRACE_MS
}

/**
 * Tracked streams whose outcome we do not know yet and that no longer appear in
 * the live or upcoming lists — so they either ran to completion or were removed
 * on YouTube. These are looked up by id.
 *
 * A stream already recorded as finished is never looked up again, which is what
 * bounds the cost of a sweep: it scales with the streams currently in flight,
 * not with everything the channel has ever broadcast.
 */
export function getUnfinishedTrackedBroadcastIds(
  trackedStreams: StreamReconciliationRow[],
  remoteBroadcastIds: Iterable<string>,
): string[] {
  const seenRemotely = new Set(remoteBroadcastIds)

  return trackedStreams
    .filter((stream) => stream.stream_status !== "complete" && !stream.actual_end_time)
    .filter((stream) => !seenRemotely.has(stream.youtube_broadcast_id))
    .map((stream) => stream.youtube_broadcast_id)
}

/**
 * The broadcasts an id lookup was asked about and did not answer for, which is
 * how YouTube reports a broadcast that no longer exists: the request succeeds
 * and the item is simply missing from the response.
 *
 * Absence only carries that meaning for ids the lookup actually covered, so the
 * ids asked about are passed in rather than inferred — an aborted or partial
 * lookup must not read as "all of these are gone".
 */
export function getDeletedBroadcastIds(
  lookedUpBroadcastIds: Iterable<string>,
  returnedBroadcastIds: Iterable<string>,
): string[] {
  const returned = new Set(returnedBroadcastIds)
  return [...lookedUpBroadcastIds].filter((broadcastId) => !returned.has(broadcastId))
}
