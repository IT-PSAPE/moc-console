import type { ApiResponse } from "./http.js"
import {
  consumeRateLimit,
  hashRateLimitSubject,
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "./rate-limit.js"

type OAuthAction = "exchange" | "refresh" | "revoke"
type OAuthProvider = "youtube" | "zoom"

/** Returns false after writing a terminal rate-limit response. */
export async function allowOAuthMutation(
  response: ApiResponse,
  userId: string,
  workspaceId: string,
  provider: OAuthProvider,
  action: OAuthAction,
): Promise<boolean> {
  try {
    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.oauthMutation,
      hashRateLimitSubject(["oauth-mutation", userId, workspaceId, provider, action]),
    )
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
