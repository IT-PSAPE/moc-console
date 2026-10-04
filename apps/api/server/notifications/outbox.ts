import { isNotificationEventKey, type NotificationEventKey } from "@moc/notifications"
import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { resolveBaseUrl } from "../base-url.js"
import { dispatchEvent, type EventPayloadMap, type NotifyDestination } from "./dispatch.js"

const MAX_ATTEMPTS = 5
const CLAIM_TIMEOUT_MS = 5 * 60_000

export type OutboxRow = {
  id: string
  workspace_id: string
  event_type: string
  entity_type: string
  entity_id: string
  event_key: string
  payload: Record<string, unknown>
  attempt_count: number
}

type DbOutboxRow = QueryResultRow & OutboxRow
type OutboxIdRow = QueryResultRow & { id: string }
type OutboxClaimQuery = (sql: string, values?: readonly unknown[]) => Promise<DbOutboxRow[]>

export type OutboxRunResult = {
  attempted: number
  dispatched: number
  failed: number
  pendingRetry: number
}

function emptyResult(): OutboxRunResult {
  return { attempted: 0, dispatched: 0, failed: 0, pendingRetry: 0 }
}

export function outboxRetryAt(attempt: number, now = Date.now()): string {
  const seconds = Math.min(60 * 30, 2 ** Math.min(attempt, 10))
  return new Date(now + seconds * 1_000).toISOString()
}

export async function enqueueOutboxEvent(args: {
  workspaceId: string
  eventType: NotificationEventKey
  entityType: string
  entityId: string
  eventKey: string
  payload: Record<string, unknown>
}): Promise<void> {
  if (
    !args.workspaceId ||
    !args.eventType.trim() ||
    !args.entityType.trim() ||
    !args.entityId ||
    !args.eventKey.trim() ||
    typeof args.payload !== "object" ||
    args.payload === null ||
    Array.isArray(args.payload)
  ) {
    throw new Error("Invalid notification outbox event")
  }
  await queryRows(
    `INSERT INTO public.notification_outbox
       (workspace_id, event_type, entity_type, entity_id, event_key, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (event_key) DO UPDATE
       SET payload = public.notification_outbox.payload || EXCLUDED.payload`,
    [args.workspaceId, args.eventType, args.entityType, args.entityId, args.eventKey, JSON.stringify(args.payload)],
  )
}

async function releaseExpiredClaims(): Promise<void> {
  const expiredBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString()
  await queryRows(
    `UPDATE public.notification_outbox SET status = 'pending'
     WHERE status = 'processing' AND last_attempt_at < $1::timestamptz`,
    [expiredBefore],
  )
}

const queryOutboxClaim: OutboxClaimQuery = (sql, values) => queryRows<DbOutboxRow>(sql, values)

export async function claimPendingOutboxRow(
  id: string,
  runQuery: OutboxClaimQuery = queryOutboxClaim,
): Promise<OutboxRow | null> {
  const [row] = await runQuery(
    `UPDATE public.notification_outbox
     SET status = 'processing', last_attempt_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, workspace_id, event_type, entity_type, entity_id, event_key, payload, attempt_count`,
    [id],
  )
  return row ?? null
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export function buildPayload(row: OutboxRow): EventPayloadMap[NotificationEventKey] {
  const payload = row.payload
  const deletedByRequester = row.event_type.endsWith(".requester_deleted")
  const requesterMutation = row.event_type.includes(".requester_")
  const trackingCode = text(payload.trackingCode)
  const changeSummary = text(payload.changeSummary)
  if (requesterMutation && (!trackingCode || !changeSummary)) {
    throw new Error("Requester notification is missing its tracking snapshot")
  }
  const baseUrl = deletedByRequester ? "" : resolveBaseUrl()
  if (!deletedByRequester && !baseUrl) throw new Error("CONSOLE_BASE_URL not configured")

  if (row.event_type.startsWith("request.")) {
    const title = text(payload.title)
    if (!title) throw new Error("Request notification is missing a title")
    return {
      title,
      status: text(payload.status),
      requesterName: text(payload.requesterName),
      ...(trackingCode ? { trackingCode } : {}),
      ...(changeSummary ? { changeSummary } : {}),
      requestId: row.entity_id,
      linkUrl: deletedByRequester ? "" : `${baseUrl}/requests/${encodeURIComponent(row.entity_id)}`,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type.startsWith("booking.")) {
    const title = text(payload.title)
    if (!title || !trackingCode) throw new Error("Booking notification is missing required details")
    return {
      title,
      status: text(payload.status),
      requesterName: text(payload.requesterName),
      trackingCode,
      ...(changeSummary ? { changeSummary } : {}),
      linkUrl: deletedByRequester ? "" : `${baseUrl}/bookings/${encodeURIComponent(row.entity_id)}`,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type.startsWith("venue_booking.")) {
    const title = text(payload.title)
    const requesterName = text(payload.requesterName)
    const venueName = text(payload.venueName)
    const startsAt = text(payload.startsAt)
    const endsAt = text(payload.endsAt)
    if (!title || !requesterName || !trackingCode || !venueName || !startsAt || !endsAt) {
      throw new Error("Venue booking notification is missing required details")
    }
    return {
      title,
      requesterName,
      trackingCode,
      venueName,
      startsAt,
      endsAt,
      ...(changeSummary ? { changeSummary } : {}),
      ...(text(payload.decision) ? { decision: text(payload.decision) } : {}),
      venueBookingId: row.entity_id,
      linkUrl: deletedByRequester ? "" : `${baseUrl}/venues/${encodeURIComponent(row.entity_id)}`,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type === "stream.created") {
    const title = text(payload.title)
    if (!title) throw new Error("Stream notification is missing a title")
    return {
      title,
      scheduledStartTime: text(payload.scheduledStartTime),
      streamUrl: text(payload.streamUrl),
      streamId: row.entity_id,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type === "stream.updated") {
    return {
      title: text(payload.title),
      streamId: row.entity_id,
      changeSummary: text(payload.changeSummary),
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type === "meeting.created") {
    const topic = text(payload.topic)
    if (!topic) throw new Error("Meeting notification is missing a topic")
    return {
      topic,
      startTime: text(payload.startTime),
      joinUrl: text(payload.joinUrl),
      meetingId: row.entity_id,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type === "meeting.updated") {
    return {
      topic: text(payload.topic),
      meetingId: row.entity_id,
      changeSummary: text(payload.changeSummary),
    } as EventPayloadMap[NotificationEventKey]
  }

  throw new Error(`Unsupported outbox event type: ${row.event_type}`)
}

function destinations(value: unknown): NotifyDestination[] | undefined {
  if (!Array.isArray(value)) return undefined
  const parsed: NotifyDestination[] = []
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    if (typeof record.groupChatId !== "string" || !record.groupChatId) continue
    if (record.threadId !== null && typeof record.threadId !== "number") continue
    parsed.push({ groupChatId: record.groupChatId, threadId: record.threadId as number | null })
  }
  return parsed.length > 0 ? parsed : undefined
}

async function dispatchClaimed(row: OutboxRow): Promise<OutboxRunResult> {
  const result = emptyResult()
  result.attempted = 1
  try {
    if (!isNotificationEventKey(row.event_type)) throw new Error(`Unknown notification event: ${row.event_type}`)
    const payload = buildPayload(row)
    await dispatchEvent(row.workspace_id, row.event_type, payload as never, {
      eventKey: row.event_key,
      destinations: destinations(row.payload.destinations),
      entityType: row.entity_type,
      entityId: row.entity_id,
    })
    await queryRows(
      `UPDATE public.notification_outbox
       SET status = 'dispatched', dispatched_at = now(), last_error = NULL
       WHERE id = $1 AND status = 'processing'`,
      [row.id],
    )
    result.dispatched = 1
    return result
  } catch (error) {
    const nextAttempt = row.attempt_count + 1
    const terminal = nextAttempt >= MAX_ATTEMPTS
    const message = error instanceof Error ? error.message : String(error)
    await queryRows(
      `UPDATE public.notification_outbox
       SET status = $2, attempt_count = $3, next_attempt_at = $4::timestamptz, last_error = $5
       WHERE id = $1 AND status = 'processing'`,
      [row.id, terminal ? "failed" : "pending", nextAttempt, terminal ? new Date().toISOString() : outboxRetryAt(nextAttempt), message.slice(0, 2_000)],
    )
    result.failed = 1
    if (!terminal) result.pendingRetry = 1
    return result
  }
}

function mergeResult(total: OutboxRunResult, next: OutboxRunResult): void {
  total.attempted += next.attempted
  total.dispatched += next.dispatched
  total.failed += next.failed
  total.pendingRetry += next.pendingRetry
}

export async function processPendingOutbox(limit = 100): Promise<OutboxRunResult> {
  await releaseExpiredClaims()
  const data = await queryRows<OutboxIdRow>(
    `SELECT id FROM public.notification_outbox
     WHERE status = 'pending' AND next_attempt_at <= now()
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  )

  const result = emptyResult()
  for (const candidate of data) {
    const row = await claimPendingOutboxRow(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}

export async function processOutboxEvent(eventKey: string): Promise<OutboxRunResult> {
  await releaseExpiredClaims()
  const data = await queryRows<OutboxIdRow>(
    `SELECT id FROM public.notification_outbox
     WHERE event_key = $1 AND status = 'pending' AND next_attempt_at <= now()`,
    [eventKey],
  )

  const result = emptyResult()
  for (const candidate of data) {
    const row = await claimPendingOutboxRow(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}

export async function processPendingOutboxForEntity(
  entityType: string,
  entityId: string,
  eventType: NotificationEventKey,
): Promise<OutboxRunResult> {
  await releaseExpiredClaims()
  const data = await queryRows<OutboxIdRow>(
    `SELECT id FROM public.notification_outbox
     WHERE entity_type = $1 AND entity_id = $2 AND event_type = $3
       AND status = 'pending' AND next_attempt_at <= now()`,
    [entityType, entityId, eventType],
  )

  const result = emptyResult()
  for (const candidate of data) {
    const row = await claimPendingOutboxRow(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}

// Same as processPendingOutboxForEntity, but across every pending event type
// for the entity — used by the "entity-changed" internal route so a console
// status change reaches Telegram immediately (across whichever follow-up
// event the mutation enqueued) instead of waiting for the 01:00 cron.
export async function processPendingOutboxForEntityAcrossEventTypes(
  entityType: string,
  entityId: string,
): Promise<OutboxRunResult> {
  await releaseExpiredClaims()
  const data = await queryRows<OutboxIdRow>(
    `SELECT id FROM public.notification_outbox
     WHERE entity_type = $1 AND entity_id = $2 AND status = 'pending' AND next_attempt_at <= now()`,
    [entityType, entityId],
  )

  const result = emptyResult()
  for (const candidate of data) {
    const row = await claimPendingOutboxRow(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}
