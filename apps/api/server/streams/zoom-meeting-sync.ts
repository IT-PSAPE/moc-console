import { ProviderUpstreamError } from "../provider-failure.js"
import { announceAdoptedEntities } from "./announce-adopted.js"
import { getZoomMeetingsToVerify, isCurrentOrUpcomingMeeting } from "./meeting-reconciliation.js"
import { toZoomMeetingUpsertRow, type ZoomMeetingSyncRow, type ZoomMeetingUpsertRow } from "./meeting-row.js"
import type { ZoomSyncConnection } from "./provider-connections.js"
import { classifySyncFailure } from "./sync-failure.js"
import { emptyProviderSyncResult, type ProviderSyncResult } from "./sync-summary.js"
import { zoomSyncStore, type ZoomSyncDependencies } from "./zoom-sync-store.js"

/**
 * Whether a failed lookup means the remaining lookups are pointless.
 *
 * The console swallows every non-`not_found` answer and keeps going. A sweep
 * cannot afford that: each request has its own timeout, nobody is watching, and
 * issuing dozens more lookups against a dead token or a rate-limited API only
 * burns the invocation. So the workspace's Zoom sync stops and the sweep
 * classifies the throw, leaving its rows exactly as they were.
 *
 * The sweep's own classifier decides, rather than a second list of error types
 * that drifted from it: a connection disconnected mid-sweep is quiet there but
 * was swallowed here, which spent one doomed lookup per remaining meeting and
 * then surfaced as an `unknown` failure when the upsert hit the deleted
 * connection's foreign key. Only a per-meeting answer — Zoom saying this one
 * meeting is gone, forbidden or unreadable — leaves the loop running.
 */
function isTerminalLookupFailure(error: unknown): boolean {
  const outcome = classifySyncFailure(error)
  if (outcome.quiet || outcome.terminalForProvider) return true
  return outcome.reason === "upstream_timed_out" || outcome.reason === "credentials_unavailable"
}

type MeetingVerification = {
  cancelledMeetingRowIds: string[]
  verifiedMeetings: ZoomMeetingSyncRow[]
}

/**
 * Confirms each tracked meeting that fell out of the upcoming list by id. Only a
 * meeting Zoom itself reports as gone is queued for deletion; one that still
 * exists is reconciled from its own record, and an inconclusive answer changes
 * nothing — an outage or a bad deployment must never read as a cancellation.
 */
async function verifyMissingMeetings(
  connection: ZoomSyncConnection,
  targets: ReturnType<typeof getZoomMeetingsToVerify>,
  dependencies: ZoomSyncDependencies,
): Promise<MeetingVerification> {
  const verification: MeetingVerification = { cancelledMeetingRowIds: [], verifiedMeetings: [] }

  for (const target of targets) {
    try {
      verification.verifiedMeetings.push(await dependencies.lookUpMeeting(connection.workspaceId, target.zoomMeetingId))
    } catch (error) {
      if (error instanceof ProviderUpstreamError && error.kind === "not_found") {
        verification.cancelledMeetingRowIds.push(target.id)
        continue
      }
      if (isTerminalLookupFailure(error)) throw error
    }
  }

  return verification
}

/**
 * Server-side counterpart of the console's manual sync
 * (apps/console/src/data/zoom-meeting-sync.ts) with the same adopt, reconcile
 * and delete rules. It runs as the service role with no signed-in user, so RLS
 * scopes nothing: every read, write and delete names the workspace explicitly,
 * and deletes are narrowed to the local row ids this run confirmed as cancelled.
 */
export async function syncWorkspaceZoomMeetings(
  connection: ZoomSyncConnection,
  dependencies: ZoomSyncDependencies = zoomSyncStore,
): Promise<ProviderSyncResult> {
  const { connectedBy, workspaceId, zoomConnectionId } = connection
  const result = emptyProviderSyncResult()

  const [upcomingMeetings, trackedMeetings] = await Promise.all([
    dependencies.fetchUpcomingMeetings(workspaceId),
    dependencies.readTrackedMeetings(workspaceId),
  ])
  const existingCreators = new Map(trackedMeetings.map((row) => [row.zoom_meeting_id, row.created_by]))

  const now = dependencies.now()
  const targets = getZoomMeetingsToVerify(trackedMeetings, upcomingMeetings.map((meeting) => meeting.id), now)
  const { cancelledMeetingRowIds, verifiedMeetings } = await verifyMissingMeetings(connection, targets, dependencies)

  // Keyed by Zoom meeting id: one upsert may not touch the same row twice.
  const payloads = new Map<number, ZoomMeetingUpsertRow>()
  const adoptedMeetingIds = new Set<number>()
  for (const meeting of [...upcomingMeetings, ...verifiedMeetings]) {
    // An existing row keeps its author: the cron has no authenticated user and
    // must never rewrite authorship on a reconcile. A newly adopted row is
    // credited to whoever authorised the integration, which is durable.
    const row = toZoomMeetingUpsertRow(meeting, workspaceId, zoomConnectionId, existingCreators.get(meeting.id) ?? connectedBy)
    // A meeting already tracked is always reconciled. One not tracked is only
    // taken on while its slot is still ahead of us.
    if (existingCreators.has(meeting.id)) {
      payloads.set(meeting.id, row)
    } else if (isCurrentOrUpcomingMeeting(row, now)) {
      payloads.set(meeting.id, row)
      adoptedMeetingIds.add(meeting.id)
    }
  }
  if (payloads.size > 0) await dependencies.upsertMeetings([...payloads.values()])
  result.adopted = adoptedMeetingIds.size
  result.reconciled = payloads.size - adoptedMeetingIds.size

  if (cancelledMeetingRowIds.length > 0) {
    await dependencies.deleteMeetings(workspaceId, cancelledMeetingRowIds)
    result.deleted = cancelledMeetingRowIds.length
  }

  if (adoptedMeetingIds.size > 0) {
    const adoptedRows = await dependencies.readAdoptedMeetings(workspaceId, [...adoptedMeetingIds])
    await announceAdoptedEntities("zoom", workspaceId, adoptedRows, (row) => dependencies.announceMeeting(workspaceId, row), result)
  }
  return result
}
