import type { ApiRequest, ApiResponse } from "../http.js"
import { consumeRateLimit, hashRateLimitRequestSubject, RATE_LIMIT_POLICIES, writeRateLimitExceeded, writeRateLimitUnavailable } from "../rate-limit.js"

export function publicOperationRateLimitSubject(request: ApiRequest, capability: string, operation: string): string {
  const mutation = capability === "publicSubmissions" && operation.startsWith("submit")
  const category = mutation ? "submission-mutation" : "submission-lookup"
  // Workspace ids are public input here. Including one would let callers rotate
  // ids to obtain fresh buckets and evade the per-client submission limit.
  return hashRateLimitRequestSubject(request, ["platform", capability, category])
}

export async function guardPublicOperation(request: ApiRequest, response: ApiResponse, capability: string, operation: string): Promise<boolean> {
  const mutation = capability === "publicSubmissions" && operation.startsWith("submit")
  const policy = mutation ? RATE_LIMIT_POLICIES.publicSubmissionMutation : RATE_LIMIT_POLICIES.publicSubmissionLookup
  try {
    const decision = await consumeRateLimit(policy, publicOperationRateLimitSubject(request, capability, operation))
    if (!decision.allowed) { writeRateLimitExceeded(response, decision); return false }
    return true
  } catch { writeRateLimitUnavailable(response); return false }
}
