import type { ApiResponse } from "./http.js"
import type { RateLimitDecision } from "./rate-limit-policy.js"

type NodeRateLimitResponse = {
  end: (body?: string | Uint8Array) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

export type RateLimitResponse = ApiResponse | NodeRateLimitResponse

const RATE_LIMIT_UNAVAILABLE_RETRY_SECONDS = 5

function isNodeRateLimitResponse(response: RateLimitResponse): response is NodeRateLimitResponse {
  return "statusCode" in response && typeof response.end === "function"
}

function writeRateLimitResponse(response: RateLimitResponse, statusCode: number, body: Record<string, unknown>): void {
  if (isNodeRateLimitResponse(response)) {
    response.statusCode = statusCode
    response.end(JSON.stringify(body))
    return
  }

  response.status(statusCode).json(body)
}

export function writeRateLimitExceeded(response: RateLimitResponse, decision: RateLimitDecision): void {
  const retryAfterSeconds = decision.retryAfterSeconds ?? 1
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Retry-After", String(retryAfterSeconds))
  writeRateLimitResponse(response, 429, {
    code: "rate_limited",
    error: "Too many requests. Please try again later.",
    retryAfterSeconds,
  })
}

export function writeRateLimitUnavailable(response: RateLimitResponse): void {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Retry-After", String(RATE_LIMIT_UNAVAILABLE_RETRY_SECONDS))
  writeRateLimitResponse(response, 503, {
    code: "rate_limit_unavailable",
    error: "Request protection is temporarily unavailable. Please try again.",
    retryAfterSeconds: RATE_LIMIT_UNAVAILABLE_RETRY_SECONDS,
  })
}
