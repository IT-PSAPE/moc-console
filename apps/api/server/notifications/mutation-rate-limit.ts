import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../rate-limit.js"
import type { ApiResponse } from "../http.js"

/** Returns false after writing a fail-closed rate-limit response. */
export async function allowAuthenticatedNotificationMutation(
  response: ApiResponse,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  try {
    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.authenticatedNotificationMutation,
      hashRateLimitSubject(["notification-mutation", userId, workspaceId]),
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
