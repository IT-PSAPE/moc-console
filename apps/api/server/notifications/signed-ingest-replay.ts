import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitRequestSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../rate-limit.js"
import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import type { ApiRequest, ApiResponse } from "../http.js"
import { isUuid } from "./signed-ingest.js"

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60
const REPLAY_TTL_SECONDS = 10 * 60
const UNIX_TIMESTAMP_PATTERN = /^\d{10}$/

export type SignedIngestReplayStore = {
  claim: (metadata: SignedIngestMetadata) => Promise<boolean>
}

export type SignedIngestMetadata = {
  nonce: string
  timestamp: string
  expiresAt: string
}

export function parseSignedIngestMetadata(
  timestamp: string | null,
  nonce: string | null,
  now = Date.now(),
): SignedIngestMetadata | null {
  if (!timestamp || !nonce || !UNIX_TIMESTAMP_PATTERN.test(timestamp) || !isUuid(nonce)) return null
  const timestampSeconds = Number(timestamp)
  const nowSeconds = Math.floor(now / 1_000)
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS) {
    return null
  }
  return {
    timestamp,
    nonce,
    expiresAt: new Date(now + REPLAY_TTL_SECONDS * 1_000).toISOString(),
  }
}

const postgresReplayStore: SignedIngestReplayStore = {
  async claim(metadata): Promise<boolean> {
    const rows = await queryRows<QueryResultRow & { claimed: boolean }>(
      `WITH expired AS (
         DELETE FROM public.notification_ingest_replays
         WHERE nonce = $1 AND expires_at <= now()
         RETURNING nonce
       ), inserted AS (
         INSERT INTO public.notification_ingest_replays (nonce, expires_at)
         SELECT $1, $2::timestamptz
         WHERE (SELECT count(*) FROM expired) >= 0
         ON CONFLICT (nonce) DO NOTHING
         RETURNING true AS claimed
       )
       SELECT coalesce((SELECT claimed FROM inserted), false) AS claimed`,
      [metadata.nonce, metadata.expiresAt],
    )
    if (rows.length !== 1 || typeof rows[0]?.claimed !== "boolean") {
      throw new Error("Notification replay claim failed")
    }
    return rows[0].claimed
  },
}

export async function claimSignedIngestNonce(
  metadata: SignedIngestMetadata,
  store: SignedIngestReplayStore = postgresReplayStore,
): Promise<boolean> {
  return store.claim(metadata)
}

export function signedIngestRateLimitSubject(request: ApiRequest, entityType: "booking" | "request"): string {
  return hashRateLimitRequestSubject(request, ["signed-ingest", entityType])
}

export async function allowSignedIngestRateLimit(
  request: ApiRequest,
  response: ApiResponse,
  entityType: "booking" | "request",
): Promise<boolean> {
  try {
    const subjectHash = signedIngestRateLimitSubject(request, entityType)
    const decision = await consumeRateLimit(RATE_LIMIT_POLICIES.signedIngest, subjectHash)
    if (decision.allowed) return true
    writeRateLimitExceeded(response, decision)
    return false
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      writeRateLimitUnavailable(response)
      return false
    }
    response.status(500).json({ error: "Unable to apply notification request protection" })
    return false
  }
}
