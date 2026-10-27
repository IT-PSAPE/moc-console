import { isSupportedWebPushEndpoint } from "./web-push.js"
import { decodeBase64UrlKey, isValidP256PublicKey } from "./p256-keys.js"

export type PushSubscriptionInput = {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

const MAX_ENDPOINT_LENGTH = 2_048
export function parsePushSubscription(value: unknown): PushSubscriptionInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const subscription = value as Record<string, unknown>
  if (Object.keys(subscription).some((key) => !["endpoint", "expirationTime", "keys"].includes(key))) return null
  const endpoint = subscription.endpoint
  const expirationTime = subscription.expirationTime
  const keys = subscription.keys
  if (typeof endpoint !== "string" || endpoint.length < 1 || endpoint.length > MAX_ENDPOINT_LENGTH
    || !isSupportedWebPushEndpoint(endpoint)) return null
  if (expirationTime !== undefined && expirationTime !== null
    && (typeof expirationTime !== "number" || !Number.isSafeInteger(expirationTime)
      || !Number.isFinite(new Date(expirationTime).getTime()) || expirationTime <= Date.now())) return null
  if (typeof keys !== "object" || keys === null || Array.isArray(keys)) return null
  const keyRecord = keys as Record<string, unknown>
  if (Object.keys(keyRecord).some((key) => !["p256dh", "auth"].includes(key))) return null
  const p256dh = keyRecord.p256dh
  const auth = keyRecord.auth
  if (typeof p256dh !== "string" || !isValidP256PublicKey(p256dh)) return null
  if (typeof auth !== "string" || !decodeBase64UrlKey(auth, 16)) return null
  return { endpoint, expirationTime: typeof expirationTime === "number" ? expirationTime : null, keys: { p256dh, auth } }
}
