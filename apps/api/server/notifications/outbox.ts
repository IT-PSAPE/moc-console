import { isNotificationEventKey, type NotificationEventKey } from "@moc/notifications"
import { resolveBaseUrl } from "../base-url.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { dispatchEvent, type EventPayloadMap, type NotifyDestination } from "./dispatch.js"

const MAX_ATTEMPTS = 5
const CLAIM_TIMEOUT_MS = 5 * 60_000

type OutboxRow = {
  id: string
  workspace_id: string
  event_type: string
  entity_type: string
  entity_id: string
  event_key: string
  payload: Record<string, unknown>
  attempt_count: number
}

export type OutboxRunResult = {
  attempted: number
  dispatched: number
  failed: number
  pendingRetry: number
}

function emptyResult(): OutboxRunResult {
  return { attempted: 0, dispatched: 0, failed: 0, pendingRetry: 0 }
}

function retryAt(attempt: number): string {
  const seconds = Math.min(60 * 30, 2 ** Math.min(attempt, 10))
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

export async function enqueueOutboxEvent(args: {
  workspaceId: string
  eventType: NotificationEventKey
  entityType: string
  entityId: string
  eventKey: string
  payload: Record<string, unknown>
}): Promise<void> {
  const admin = getSupabaseAdmin()
  const { error } = await admin.from("notification_outbox").upsert({
    workspace_id: args.workspaceId,
    event_type: args.eventType,
    entity_type: args.entityType,
    entity_id: args.entityId,
    event_key: args.eventKey,
    payload: args.payload,
  }, { onConflict: "event_key", ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

async function releaseExpiredClaims(): Promise<void> {
  const admin = getSupabaseAdmin()
  const expiredBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString()
  const { error } = await admin
    .from("notification_outbox")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("last_attempt_at", expiredBefore)
  if (error) throw new Error(error.message)
}

async function claimOutbox(id: string): Promise<OutboxRow | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_outbox")
    .update({ status: "processing", last_attempt_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, workspace_id, event_type, entity_type, entity_id, event_key, payload, attempt_count")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as OutboxRow | null
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function buildPayload(row: OutboxRow): EventPayloadMap[NotificationEventKey] {
  const payload = row.payload
  const baseUrl = resolveBaseUrl()
  if (!baseUrl) throw new Error("CONSOLE_BASE_URL not configured")

  if (row.event_type.startsWith("request.")) {
    const title = text(payload.title)
    if (!title) throw new Error("Request notification is missing a title")
    return {
      title,
      status: text(payload.status),
      requesterName: text(payload.requesterName),
      requestId: row.entity_id,
      linkUrl: `${baseUrl}/requests/${encodeURIComponent(row.entity_id)}`,
    } as EventPayloadMap[NotificationEventKey]
  }

  if (row.event_type.startsWith("booking.")) {
    const title = text(payload.title)
    const trackingCode = text(payload.trackingCode)
    if (!title || !trackingCode) throw new Error("Booking notification is missing required details")
    return {
      title,
      status: text(payload.status),
      requesterName: text(payload.requesterName),
      trackingCode,
      linkUrl: `${baseUrl}/bookings/${encodeURIComponent(row.entity_id)}`,
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
  const admin = getSupabaseAdmin()
  try {
    if (!isNotificationEventKey(row.event_type)) throw new Error(`Unknown notification event: ${row.event_type}`)
    const payload = buildPayload(row)
    await dispatchEvent(row.workspace_id, row.event_type, payload as never, {
      eventKey: row.event_key,
      destinations: destinations(row.payload.destinations),
    })
    const { error } = await admin
      .from("notification_outbox")
      .update({ status: "dispatched", dispatched_at: new Date().toISOString(), last_error: null })
      .eq("id", row.id)
      .eq("status", "processing")
    if (error) throw new Error(error.message)
    result.dispatched = 1
    return result
  } catch (error) {
    const nextAttempt = row.attempt_count + 1
    const terminal = nextAttempt >= MAX_ATTEMPTS
    const message = error instanceof Error ? error.message : String(error)
    const { error: updateError } = await admin
      .from("notification_outbox")
      .update({
        status: terminal ? "failed" : "pending",
        attempt_count: nextAttempt,
        next_attempt_at: terminal ? new Date().toISOString() : retryAt(nextAttempt),
        last_error: message.slice(0, 2_000),
      })
      .eq("id", row.id)
      .eq("status", "processing")
    if (updateError) throw new Error(updateError.message)
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
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_outbox")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)

  const result = emptyResult()
  for (const candidate of (data ?? []) as { id: string }[]) {
    const row = await claimOutbox(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}

export async function processOutboxEvent(eventKey: string): Promise<OutboxRunResult> {
  await releaseExpiredClaims()
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_outbox")
    .select("id")
    .eq("event_key", eventKey)
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
  if (error) throw new Error(error.message)

  const result = emptyResult()
  for (const candidate of (data ?? []) as { id: string }[]) {
    const row = await claimOutbox(candidate.id)
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
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_outbox")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("event_type", eventType)
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
  if (error) throw new Error(error.message)

  const result = emptyResult()
  for (const candidate of (data ?? []) as { id: string }[]) {
    const row = await claimOutbox(candidate.id)
    if (row) mergeResult(result, await dispatchClaimed(row))
  }
  return result
}
