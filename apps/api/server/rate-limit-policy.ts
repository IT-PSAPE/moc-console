type RateLimitFailureMode = "open" | "closed"

export type RateLimitPolicyName =
  | "public_notification_wake"
  | "signed_ingest"
  | "oauth_mutation"
  | "provider_proxy_read"
  | "provider_proxy_write"
  | "telegram_webhook"
  | "authenticated_notification_mutation"

export type RateLimitPolicy = {
  name: RateLimitPolicyName
  limit: number
  windowSeconds: number
  failureMode: RateLimitFailureMode
}

export const RATE_LIMIT_POLICIES = {
  publicNotificationWake: {
    name: "public_notification_wake",
    limit: 12,
    windowSeconds: 60,
    failureMode: "closed",
  },
  signedIngest: {
    name: "signed_ingest",
    limit: 120,
    windowSeconds: 60,
    failureMode: "closed",
  },
  oauthMutation: {
    name: "oauth_mutation",
    limit: 20,
    windowSeconds: 300,
    failureMode: "closed",
  },
  providerProxyRead: {
    name: "provider_proxy_read",
    limit: 120,
    windowSeconds: 60,
    failureMode: "open",
  },
  providerProxyWrite: {
    name: "provider_proxy_write",
    limit: 30,
    windowSeconds: 300,
    failureMode: "closed",
  },
  telegramWebhook: {
    name: "telegram_webhook",
    limit: 100,
    windowSeconds: 60,
    failureMode: "closed",
  },
  authenticatedNotificationMutation: {
    name: "authenticated_notification_mutation",
    limit: 30,
    windowSeconds: 60,
    failureMode: "closed",
  },
} as const satisfies Record<string, RateLimitPolicy>

export type RateLimitDecision = {
  allowed: boolean
  limit: number
  remaining: number | null
  retryAfterSeconds: number | null
  degraded: boolean
}

export type RateLimitStore = {
  consume: (policy: RateLimitPolicyName, subjectHash: string) => Promise<unknown>
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limiting is temporarily unavailable")
    this.name = "RateLimitUnavailableError"
  }
}
