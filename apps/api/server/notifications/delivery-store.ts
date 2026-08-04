import { getSupabaseAdmin } from "../supabase-admin.js"
import { sendTelegramMessageDetailed } from "../telegram.js"

const MAX_ATTEMPTS = 5
const CLAIM_TIMEOUT_MS = 5 * 60_000

type DeliveryRow = {
  id: string
  workspace_id: string
  event_key: string
  event_type: string | null
  scope: "group" | "dm"
  route_id: string | null
  recipient_user_id: string | null
  destination_key: string
  chat_id: string
  thread_id: number | null
  text: string
  payload: unknown
  attempt_count: number
}

export type DeliveryInput = {
  workspaceId: string
  eventKey: string
  eventType: string | null
  scope: "group" | "dm"
  routeId?: string | null
  recipientUserId?: string | null
  chatId: string
  threadId?: number | null
  text: string
  payload: unknown
}

export type DeliveryRunResult = {
  attempted: number
  sent: number
  failed: number
  pendingRetry: number
}

function emptyResult(): DeliveryRunResult {
  return { attempted: 0, sent: 0, failed: 0, pendingRetry: 0 }
}

function destinationKey(scope: "group" | "dm", chatId: string, threadId: number | null): string {
  return `${scope}:${chatId}:${threadId ?? "main"}`
}

function retryAt(attempt: number, retryAfterSeconds: number | null): string {
  const seconds = retryAfterSeconds ?? Math.min(60 * 30, 2 ** Math.min(attempt, 10))
  return new Date(Date.now() + seconds * 1_000).toISOString()
}

export async function enqueueDelivery(input: DeliveryInput): Promise<void> {
  const admin = getSupabaseAdmin()
  const threadId = input.threadId ?? null
  const { error } = await admin.from("notification_deliveries").upsert({
    workspace_id: input.workspaceId,
    event_key: input.eventKey,
    event_type: input.eventType,
    scope: input.scope,
    route_id: input.routeId ?? null,
    recipient_user_id: input.recipientUserId ?? null,
    destination_key: destinationKey(input.scope, input.chatId, threadId),
    chat_id: input.chatId,
    thread_id: threadId,
    text: input.text,
    payload: input.payload,
  }, { onConflict: "event_key,destination_key", ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}

async function releaseExpiredClaims(): Promise<void> {
  const admin = getSupabaseAdmin()
  const expiredBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString()
  const { error } = await admin
    .from("notification_deliveries")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("last_attempt_at", expiredBefore)
  if (error) throw new Error(error.message)
}

async function claimDelivery(id: string): Promise<DeliveryRow | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_deliveries")
    .update({ status: "processing", last_attempt_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, workspace_id, event_key, event_type, scope, route_id, recipient_user_id, destination_key, chat_id, thread_id, text, payload, attempt_count")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as DeliveryRow | null
}

async function sendClaimedDelivery(row: DeliveryRow): Promise<DeliveryRunResult> {
  const result = emptyResult()
  result.attempted = 1
  const send = await sendTelegramMessageDetailed(row.chat_id, row.text, {
    parseMode: "HTML",
    ...(row.thread_id !== null ? { threadId: row.thread_id } : {}),
  })
  const admin = getSupabaseAdmin()

  if (send.ok) {
    const { error } = await admin
      .from("notification_deliveries")
      .update({
        status: "sent",
        attempt_count: row.attempt_count + 1,
        sent_at: new Date().toISOString(),
        telegram_message_id: send.result?.message_id ?? null,
        last_error: null,
      })
      .eq("id", row.id)
      .eq("status", "processing")
    if (error) throw new Error(error.message)
    result.sent = 1
    return result
  }

  const nextAttempt = row.attempt_count + 1
  const terminal = nextAttempt >= MAX_ATTEMPTS
  const { error } = await admin
    .from("notification_deliveries")
    .update({
      status: terminal ? "failed" : "pending",
      attempt_count: nextAttempt,
      next_attempt_at: terminal ? new Date().toISOString() : retryAt(nextAttempt, send.retryAfterSeconds),
      last_error: send.description.slice(0, 2_000),
    })
    .eq("id", row.id)
    .eq("status", "processing")
  if (error) throw new Error(error.message)
  result.failed = 1
  if (!terminal) result.pendingRetry = 1
  return result
}

function mergeResult(total: DeliveryRunResult, next: DeliveryRunResult): void {
  total.attempted += next.attempted
  total.sent += next.sent
  total.failed += next.failed
  total.pendingRetry += next.pendingRetry
}

async function processRows(rows: { id: string }[]): Promise<DeliveryRunResult> {
  const total = emptyResult()
  for (const row of rows) {
    const claimed = await claimDelivery(row.id)
    if (!claimed) continue
    mergeResult(total, await sendClaimedDelivery(claimed))
  }
  return total
}

export async function processDeliveriesForEvent(eventKey: string): Promise<DeliveryRunResult> {
  await releaseExpiredClaims()
  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("notification_deliveries")
    .select("id")
    .eq("event_key", eventKey)
    .eq("status", "pending")
    .lte("next_attempt_at", now)
  if (error) throw new Error(error.message)
  return processRows((data ?? []) as { id: string }[])
}

export async function processPendingDeliveries(limit = 100): Promise<DeliveryRunResult> {
  await releaseExpiredClaims()
  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("notification_deliveries")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return processRows((data ?? []) as { id: string }[])
}
