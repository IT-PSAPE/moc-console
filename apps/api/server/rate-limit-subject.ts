import { createHash } from "node:crypto"

import { headerValue } from "./http.js"
import type { ApiRequest } from "./http.js"

/**
 * Produces the only identifier persisted by the rate-limit table. Callers must
 * pass stable, non-secret identifiers such as a user, workspace, entity, or
 * client address. Never include session tokens, OAuth credentials, or HMACs.
 */
export function hashRateLimitSubject(parts: readonly string[]): string {
  if (!parts.length || parts.some((part) => !part || part.length > 512)) {
    throw new Error("Rate limit subject is invalid")
  }

  return createHash("sha256")
    .update(JSON.stringify({ namespace: "moc-api-rate-limit-v1", parts }))
    .digest("hex")
}

/**
 * Hashes request-derived and domain identifiers together. Raw IP addresses are
 * kept in-process only and never sent to Supabase or logged by this module.
 */
export function hashRateLimitRequestSubject(request: ApiRequest, parts: readonly string[]): string {
  const forwardedFor = headerValue(request.headers, "x-forwarded-for")
  const candidate = forwardedFor?.split(",")[0]?.trim() || headerValue(request.headers, "x-real-ip") || "unknown"
  const clientAddress = candidate.length <= 128 ? candidate : "unknown"
  return hashRateLimitSubject([...parts, `client-address:${clientAddress}`])
}
