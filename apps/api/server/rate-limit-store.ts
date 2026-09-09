import { getSupabaseAdmin } from "./supabase-admin.js"
import type { RateLimitDecision, RateLimitPolicy, RateLimitPolicyName, RateLimitStore } from "./rate-limit-policy.js"
import { RateLimitUnavailableError } from "./rate-limit-policy.js"

type RateLimitRpcResult = {
  allowed: unknown
  limit_value: unknown
  remaining: unknown
  retry_after_seconds: unknown
}

const SUBJECT_HASH_PATTERN = /^[a-f0-9]{64}$/

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function parseRateLimitRpcResult(data: unknown, policy: RateLimitPolicy): RateLimitDecision {
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Rate limit RPC returned an invalid result")
  }

  const result = data[0] as RateLimitRpcResult
  if (
    typeof result !== "object" ||
    result === null ||
    typeof result.allowed !== "boolean" ||
    !isNonNegativeInteger(result.limit_value) ||
    !isNonNegativeInteger(result.remaining) ||
    !isNonNegativeInteger(result.retry_after_seconds)
  ) {
    throw new Error("Rate limit RPC returned an invalid result")
  }

  if (result.limit_value !== policy.limit || result.remaining > result.limit_value) {
    throw new Error("Rate limit RPC returned a policy mismatch")
  }

  return {
    allowed: result.allowed,
    limit: result.limit_value,
    remaining: result.remaining,
    retryAfterSeconds: result.allowed ? null : Math.max(1, result.retry_after_seconds),
    degraded: false,
  }
}

function getSupabaseRateLimitStore(): RateLimitStore {
  return {
    async consume(policy: RateLimitPolicyName, subjectHash: string): Promise<unknown> {
      const { data, error } = await getSupabaseAdmin().rpc("consume_api_rate_limit", {
        p_policy: policy,
        p_subject_hash: subjectHash,
      })
      if (error) throw new Error("Rate limit storage request failed")
      return data
    },
  }
}

export async function consumeRateLimit(
  policy: RateLimitPolicy,
  subjectHash: string,
  store: RateLimitStore = getSupabaseRateLimitStore(),
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

  return parseRateLimitRpcResult(data, policy)
}
