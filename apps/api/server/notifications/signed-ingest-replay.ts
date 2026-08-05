import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitRequestSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../rate-limit.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
import type { ApiRequest, ApiResponse } from "../http.js"
import { isUuid } from "./signed-ingest.js"

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60
const REPLAY_TTL_SECONDS = 10 * 60
const UNIX_TIMESTAMP_PATTERN = /^\d{10}$/

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

export async function claimSignedIngestNonce(metadata: SignedIngestMetadata): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc("claim_notification_ingest_nonce", {
    p_nonce: metadata.nonce,
    p_expires_at: metadata.expiresAt,
  })
  if (error) throw new Error("Notification replay claim failed")
  return data === true
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
