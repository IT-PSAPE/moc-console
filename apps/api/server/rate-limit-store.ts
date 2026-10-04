import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  type RateLimitDecision,
  type RateLimitPolicy,
  type RateLimitPolicyName,
  type RateLimitStore,
} from "./rate-limit-policy.js"

type RateLimitStorageRow = QueryResultRow & {
  allowed: unknown
  limit_value: unknown
  remaining: unknown
  retry_after_seconds: unknown
}

const SUBJECT_HASH_PATTERN = /^[a-f0-9]{64}$/

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function parseRateLimitResult(data: unknown, policy: RateLimitPolicy): RateLimitDecision {
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Rate limit storage returned an invalid result")
  }

  const result = data[0] as RateLimitStorageRow
  if (
    typeof result !== "object" ||
    result === null ||
    typeof result.allowed !== "boolean" ||
    !isNonNegativeInteger(result.limit_value) ||
    !isNonNegativeInteger(result.remaining) ||
    !isNonNegativeInteger(result.retry_after_seconds)
  ) {
    throw new Error("Rate limit storage returned an invalid result")
  }

  if (result.limit_value !== policy.limit || result.remaining > result.limit_value) {
    throw new Error("Rate limit storage returned a policy mismatch")
  }

  return {
    allowed: result.allowed,
    limit: result.limit_value,
    remaining: result.remaining,
    retryAfterSeconds: result.allowed ? null : Math.max(1, result.retry_after_seconds),
    degraded: false,
  }
}

function getPostgresRateLimitStore(): RateLimitStore {
  return {
    async consume(policy: RateLimitPolicyName, subjectHash: string): Promise<unknown> {
      const configured = Object.values(RATE_LIMIT_POLICIES).find((candidate) => candidate.name === policy)
      if (!configured) throw new Error("Rate limit policy is not configured")
      const windowStartSeconds = Math.floor(Date.now() / 1_000 / configured.windowSeconds) * configured.windowSeconds
      const claimed = await queryRows<RateLimitStorageRow>(
        `INSERT INTO public.api_rate_limit_windows (policy, subject_hash, window_started_at, request_count)
         VALUES ($1, $2, to_timestamp($3), 1)
         ON CONFLICT (policy, subject_hash, window_started_at) DO UPDATE
         SET request_count = public.api_rate_limit_windows.request_count + 1,
             updated_at = now()
         WHERE public.api_rate_limit_windows.request_count < $4
         RETURNING true AS allowed, $4::integer AS limit_value,
           greatest($4 - request_count, 0)::integer AS remaining, 0::integer AS retry_after_seconds`,
        [policy, subjectHash, windowStartSeconds, configured.limit],
      )
      if (claimed.length > 0) return claimed

      return queryRows<RateLimitStorageRow>(
        `SELECT false AS allowed, $4::integer AS limit_value,
           greatest($4 - request_count, 0)::integer AS remaining,
           greatest(1, ceil(extract(epoch FROM (to_timestamp($3) + make_interval(secs => $5) - now()))))::integer AS retry_after_seconds
         FROM public.api_rate_limit_windows
         WHERE policy = $1 AND subject_hash = $2 AND window_started_at = to_timestamp($3)`,
        [policy, subjectHash, windowStartSeconds, configured.limit, configured.windowSeconds],
      )
    },
  }
}

export async function consumeRateLimit(
  policy: RateLimitPolicy,
  subjectHash: string,
  store: RateLimitStore = getPostgresRateLimitStore(),
): Promise<RateLimitDecision> {
  if (!SUBJECT_HASH_PATTERN.test(subjectHash)) {
    throw new Error("Rate limit subject hash is invalid")
  }

  let data: unknown
  try {
    data = await store.consume(policy.name, subjectHash)
  } catch {
    if (policy.failureMode === "open") {
      return {
        allowed: true,
        limit: policy.limit,
        remaining: null,
        retryAfterSeconds: null,
        degraded: true,
      }
    }
    throw new RateLimitUnavailableError()
  }

  return parseRateLimitResult(data, policy)
}
