import { queryRows } from "@moc/backend/database"
import type { PoolClient, QueryResultRow } from "pg"
import { getWebPushVapidConfig } from "./web-push-config.js"
import { sendWebPush, type WebPushSendResult, type WebPushSubscription } from "./web-push.js"

export type ConsolePushPayload = { title: string; body?: string; url?: string; tag?: string }

type PushDeliveryRow = QueryResultRow & {
  id: string
  subscription_id: string
  user_id: string
  workspace_id: string | null
  event_key: string
  payload: ConsolePushPayload
  attempt_count: number
  last_attempt_at: string
  endpoint: string
  p256dh: string
  auth: string
  expiration_time: string | null
}

export type ConsolePushRunResult = { attempted: number; sent: number; failed: number; pendingRetry: number }

const MAX_ATTEMPTS = 5
const CLAIM_TIMEOUT_MS = 5 * 60_000
const MAX_BATCH_SIZE = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function emptyResult(): ConsolePushRunResult {
  return { attempted: 0, sent: 0, failed: 0, pendingRetry: 0 }
}

export function parseConsolePushPayload(value: unknown): ConsolePushPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid Console push payload")
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !["title", "body", "url", "tag"].includes(key))) throw new Error("Invalid Console push payload")
  const title = typeof record.title === "string" ? record.title.trim() : ""
  if (!title || title.length > 120) throw new Error("Invalid Console push title")
  const body = record.body
  const url = record.url
  const tag = record.tag
  if (body !== undefined && (typeof body !== "string" || body.length > 500)) throw new Error("Invalid Console push body")
  if (tag !== undefined && (typeof tag !== "string" || !tag || tag.length > 128)) throw new Error("Invalid Console push tag")
  if (url !== undefined && (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || url.includes("\\") || url.length > 2_048)) {
    throw new Error("Invalid Console push URL")
  }
  const payload = { title, ...(body === undefined ? {} : { body }), ...(url === undefined ? {} : { url }), ...(tag === undefined ? {} : { tag }) }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 3_000) throw new Error("Console push payload is too large")
  return payload
}

/** Enqueues through the worker role; a supplied client must already be in a worker transaction. */
export async function enqueueConsolePush(args: {
  userId: string
  workspaceId?: string | null
  eventKey: string
  payload: ConsolePushPayload
  /** Restricts a self-test to the subscription already proven to belong to the caller. */
  subscriptionId?: string
}, workerClient?: PoolClient): Promise<number> {
  const userId = args.userId
  const workspaceId = args.workspaceId ?? null
  const eventKey = args.eventKey
  if (!UUID.test(userId) || (workspaceId !== null && !UUID.test(workspaceId))) throw new Error("Invalid Console push recipient")
  if (typeof eventKey !== "string" || eventKey.trim().length < 1 || eventKey.length > 256) throw new Error("Invalid Console push event key")
  if (args.subscriptionId !== undefined && !UUID.test(args.subscriptionId)) throw new Error("Invalid Console push subscription")
  const payload = parseConsolePushPayload(args.payload)
  const rows = await queryRows<QueryResultRow & { id: string }>(
    `INSERT INTO moc_private.console_push_deliveries (subscription_id, workspace_id, event_key, payload)
     SELECT subscription.id, $2::uuid, $3, $4::jsonb
     FROM moc_private.console_push_subscriptions AS subscription
     WHERE subscription.user_id = $1::uuid
       AND (subscription.expiration_time IS NULL OR subscription.expiration_time > now())
       AND ($5::uuid IS NULL OR subscription.id = $5::uuid)
       AND ($2::uuid IS NULL OR EXISTS (
         SELECT 1 FROM public.workspace_users AS membership
         WHERE membership.workspace_id = $2::uuid AND membership.user_id = subscription.user_id
       ))
     ON CONFLICT (event_key, subscription_id) DO NOTHING
     RETURNING id`,
    [userId, workspaceId, eventKey, JSON.stringify(payload), args.subscriptionId ?? null],
    workerClient,
  )
  return rows.length
}

function retryAt(attempt: number, retryAfter: string | null, now = Date.now()): string {
  const backoff = Math.min(60 * 60_000, 2 ** Math.min(attempt, 10) * 1_000)
  let providerDelay = 0
  if (retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter.trim())) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) providerDelay = Math.max(0, Math.min(24 * 60 * 60_000, seconds * 1_000))
  } else if (retryAfter) {
    const timestamp = Date.parse(retryAfter)
    if (Number.isFinite(timestamp)) providerDelay = Math.max(0, Math.min(24 * 60 * 60_000, timestamp - now))
  }
  return new Date(now + Math.max(backoff, providerDelay)).toISOString()
}

async function releaseExpiredClaims(): Promise<void> {
  await queryRows(
    `UPDATE moc_private.console_push_deliveries SET status='pending'
     WHERE status='processing' AND last_attempt_at < clock_timestamp() - ($1::bigint * interval '1 millisecond')`,
    [CLAIM_TIMEOUT_MS],
  )
}

async function claimDelivery(id: string): Promise<PushDeliveryRow | null> {
  const [row] = await queryRows<PushDeliveryRow>(
    `UPDATE moc_private.console_push_deliveries AS delivery
     SET status='processing', last_attempt_at=clock_timestamp()
     FROM moc_private.console_push_subscriptions AS subscription
     WHERE delivery.id=$1 AND delivery.status='pending' AND delivery.next_attempt_at<=clock_timestamp()
       AND subscription.id=delivery.subscription_id
     RETURNING delivery.id, delivery.subscription_id, subscription.user_id, delivery.workspace_id,
       delivery.event_key, delivery.payload, delivery.attempt_count,
       delivery.last_attempt_at::text AS last_attempt_at, subscription.endpoint, subscription.p256dh,
       subscription.auth, subscription.expiration_time::text AS expiration_time`,
    [id],
  )
  return row ?? null
}

async function stillWorkspaceMember(row: PushDeliveryRow): Promise<boolean> {
  if (!row.workspace_id) return true
  const [membership] = await queryRows<QueryResultRow & { exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM public.workspace_users WHERE workspace_id=$1 AND user_id=$2) AS exists`,
    [row.workspace_id, row.user_id],
  )
  return membership?.exists === true
}

async function completeDelivery(row: PushDeliveryRow, send: WebPushSendResult): Promise<ConsolePushRunResult> {
  const result = emptyResult()
  result.attempted = 1
  if (send.ok) {
    const updated = await queryRows<QueryResultRow & { id: string }>(
      `UPDATE moc_private.console_push_deliveries
       SET status='sent', attempt_count=$3, sent_at=clock_timestamp(), last_error=NULL
       WHERE id=$1 AND status='processing' AND last_attempt_at=$2::timestamptz
       RETURNING id`,
      [row.id, row.last_attempt_at, row.attempt_count + 1],
    )
    result.sent = updated.length
    return result
  }

  if (send.expired) {
    result.failed = (await deleteExpiredSubscription(row)).failed
    return result
  }

  const nextAttempt = row.attempt_count + 1
  const terminal = !send.retryable || nextAttempt >= MAX_ATTEMPTS
  const errorCode = send.status === null ? send.error : `http_${send.status}`
  const updated = await queryRows<QueryResultRow & { id: string }>(
    `UPDATE moc_private.console_push_deliveries
     SET status=$3, attempt_count=$4, next_attempt_at=$5::timestamptz, last_error=$6
     WHERE id=$1 AND status='processing' AND last_attempt_at=$2::timestamptz
     RETURNING id`,
    [row.id, row.last_attempt_at, terminal ? "failed" : "pending", nextAttempt,
      terminal ? new Date().toISOString() : retryAt(nextAttempt, send.retryAfter), errorCode],
  )
  result.failed = updated.length
  if (updated.length && !terminal) result.pendingRetry = 1
  return result
}

function addResult(total: ConsolePushRunResult, next: ConsolePushRunResult): void {
  total.attempted += next.attempted
  total.sent += next.sent
  total.failed += next.failed
  total.pendingRetry += next.pendingRetry
}

async function failRevokedDelivery(row: PushDeliveryRow): Promise<ConsolePushRunResult> {
  const updated = await queryRows<QueryResultRow & { id: string }>(
    `UPDATE moc_private.console_push_deliveries
     SET status='failed', last_error='Recipient no longer belongs to the workspace'
     WHERE id=$1 AND status='processing' AND last_attempt_at=$2::timestamptz
     RETURNING id`,
    [row.id, row.last_attempt_at],
  )
  return { attempted: 0, sent: 0, failed: updated.length, pendingRetry: 0 }
}

async function deleteExpiredSubscription(row: PushDeliveryRow): Promise<ConsolePushRunResult> {
  const deleted = await queryRows<QueryResultRow & { id: string }>(
    `DELETE FROM moc_private.console_push_subscriptions AS subscription
     USING moc_private.console_push_deliveries AS delivery
     WHERE subscription.id=$1 AND delivery.id=$2 AND delivery.status='processing'
       AND delivery.last_attempt_at=$3::timestamptz
     RETURNING subscription.id`,
    [row.subscription_id, row.id, row.last_attempt_at],
  )
  return { attempted: 0, sent: 0, failed: deleted.length, pendingRetry: 0 }
}

export async function processPendingConsolePushDeliveries(limit = 100): Promise<ConsolePushRunResult> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_BATCH_SIZE) throw new Error("Invalid Console push delivery batch size")
  const config = getWebPushVapidConfig()
  if (!config) return emptyResult()

  await queryRows(
    `DELETE FROM moc_private.console_push_deliveries
     WHERE status IN ('sent', 'failed') AND created_at < now() - interval '30 days'`,
  )
  await releaseExpiredClaims()
  const pending = await queryRows<QueryResultRow & { id: string }>(
    `SELECT id FROM moc_private.console_push_deliveries
     WHERE status='pending' AND next_attempt_at <= now()
     ORDER BY next_attempt_at, created_at, id LIMIT $1`,
    [limit],
  )
  const result = emptyResult()
  for (const candidate of pending) {
    const row = await claimDelivery(candidate.id)
    if (!row) continue
    if (row.expiration_time && Date.parse(row.expiration_time) <= Date.now()) {
      addResult(result, await deleteExpiredSubscription(row))
      continue
    }
    if (!await stillWorkspaceMember(row)) {
      addResult(result, await failRevokedDelivery(row))
      continue
    }
    let send: WebPushSendResult
    try {
      const subscription: WebPushSubscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }
      send = await sendWebPush(subscription, JSON.stringify(row.payload), config)
    } catch {
      send = { ok: false, status: null, retryAfter: null, expired: false, retryable: false, error: "network" }
    }
    addResult(result, await completeDelivery(row, send))
  }
  return result
}
