import {
  consumeRateLimit,
  hashRateLimitSubject,
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  type RateLimitResponse,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "./rate-limit.js"

/** Returns false after writing a terminal rate-limit response. */
export async function allowProviderProxyRequest(
  response: RateLimitResponse,
  userId: string,
  workspaceId: string,
  provider: "youtube" | "zoom",
  method: string | undefined,
): Promise<boolean> {
  const policy = method === "GET" ? RATE_LIMIT_POLICIES.providerProxyRead : RATE_LIMIT_POLICIES.providerProxyWrite
  try {
    const decision = await consumeRateLimit(policy, hashRateLimitSubject(["provider-proxy", userId, workspaceId, provider]))
    if (decision.allowed) return true
    writeRateLimitExceeded(response, decision)
    return false
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      writeRateLimitUnavailable(response)
      return false
    }
    throw error
  }
}
