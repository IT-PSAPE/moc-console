import { isIP } from "node:net"
import { encryptWebPushPayload } from "./web-push-encryption.js"
import { createVapidAuthorization, type VapidConfig } from "./web-push-vapid.js"

const DEFAULT_TTL_SECONDS = 3600
const DEFAULT_TIMEOUT_MS = 8000
const MAX_TTL_SECONDS = 86400
const MAX_TIMEOUT_MS = 60000
const PUSH_PROVIDER_DOMAINS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
]

export interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export interface WebPushSendOptions {
  ttl?: number
  timeoutMs?: number
}

export type WebPushSendResult =
  | { ok: true; status: number; retryAfter: null; expired: false; retryable: false }
  | { ok: false; status: number; retryAfter: string | null; expired: boolean; retryable: boolean; error: "http" }
  | { ok: false; status: null; retryAfter: null; expired: false; retryable: boolean; error: "invalid-endpoint" | "network" | "timeout" }

export function isSupportedWebPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    const hostname = url.hostname.toLowerCase()
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.hash
      && (!url.port || url.port === "443")
      && isIP(hostname) === 0
      && PUSH_PROVIDER_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

function failedEndpoint(): WebPushSendResult {
  return { ok: false, status: null, retryAfter: null, expired: false, retryable: false, error: "invalid-endpoint" }
}

export async function sendWebPush(subscription: WebPushSubscription, serializedPayload: string, config: VapidConfig, options: WebPushSendOptions = {}): Promise<WebPushSendResult> {
  const ttl = options.ttl ?? DEFAULT_TTL_SECONDS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!isSupportedWebPushEndpoint(subscription.endpoint)) return failedEndpoint()
  if (!Number.isSafeInteger(ttl) || ttl < 0 || ttl > MAX_TTL_SECONDS) throw new Error("Invalid Web Push TTL")
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) throw new Error("Invalid Web Push timeout")

  const encrypted = encryptWebPushPayload(serializedPayload, subscription.keys.p256dh, subscription.keys.auth)
  const authorization = createVapidAuthorization(subscription.endpoint, config)
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttl),
      },
      body: Uint8Array.from(encrypted.body),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    })
    await response.body?.cancel()
    if (response.ok) return { ok: true, status: response.status, retryAfter: null, expired: false, retryable: false }
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500
    return {
      ok: false,
      status: response.status,
      retryAfter: retryable ? response.headers.get("retry-after") : null,
      expired: response.status === 404 || response.status === 410,
      retryable,
      error: "http",
    }
  } catch (error) {
    const errorName = error instanceof Error ? error.name : ""
    const timeout = errorName === "TimeoutError" || errorName === "AbortError"
    return { ok: false, status: null, retryAfter: null, expired: false, retryable: true, error: timeout ? "timeout" : "network" }
  }
}
