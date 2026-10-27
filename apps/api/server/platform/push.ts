import { randomUUID } from "node:crypto"
import type { PlatformOperation } from "./context.js"
import { objectInput, PlatformInputError, stringField } from "./input.js"
import { enqueueConsolePush } from "../push/delivery-store.js"
import { parsePushSubscription } from "../push/subscription-input.js"
import { getWebPushPublicKey } from "../push/web-push-config.js"
import { isSupportedWebPushEndpoint } from "../push/web-push.js"
import { consumeRateLimit, hashRateLimitSubject, RATE_LIMIT_POLICIES } from "../rate-limit.js"

function emptyInput(input: unknown): void {
  if (input === null || (typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0)) return
  objectInput(input, [])
}

function endpointInput(input: unknown): string {
  const record = objectInput(input, ["endpoint"])
  const endpoint = stringField(record, "endpoint")
  if (endpoint.length > 2_048 || !isSupportedWebPushEndpoint(endpoint)) throw new PlatformInputError("Invalid push endpoint")
  return endpoint
}

function conflictError(): Error {
  return Object.assign(new Error("This push subscription belongs to another account"), { status: 409, code: "conflict" })
}

function rateLimitError(): Error {
  return Object.assign(new Error("Too many test notifications. Please try again later."), { status: 429, code: "rate_limited" })
}

export const operations: Record<string, PlatformOperation> = {
  config: {
    permission: "authenticated",
    run: async (_context, input) => {
      emptyInput(input)
      const publicKey = getWebPushPublicKey()
      return { enabled: publicKey !== null, publicKey }
    },
  },
  status: {
    permission: "authenticated",
    async run(context, input) {
      const endpoint = endpointInput(input)
      const result = await context.db.query<{ subscribed: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM moc_private.console_push_subscriptions
           WHERE user_id=$1 AND endpoint=$2
             AND (expiration_time IS NULL OR expiration_time > now())
         ) AS subscribed`,
        [context.userId, endpoint],
      )
      return { subscribed: result.rows[0]?.subscribed === true }
    },
  },
  subscribe: {
    permission: "authenticated",
    async run(context, input) {
      const record = objectInput(input, ["subscription"])
      const subscription = parsePushSubscription(record.subscription)
      if (!subscription) throw new PlatformInputError("Invalid push subscription")
      if (!getWebPushPublicKey()) throw new Error("Push notifications are not configured")
      const expirationTime = subscription.expirationTime === null ? null : new Date(subscription.expirationTime).toISOString()
      const inserted = await context.db.query<{ id: string }>(
        `INSERT INTO moc_private.console_push_subscriptions (user_id, endpoint, p256dh, auth, expiration_time)
         VALUES ($1, $2, $3, $4, $5::timestamptz)
         ON CONFLICT (endpoint) DO NOTHING RETURNING id`,
        [context.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, expirationTime],
      )
      if (inserted.rows[0]) return { id: inserted.rows[0].id }
      const updated = await context.db.query<{ id: string }>(
        `UPDATE moc_private.console_push_subscriptions
         SET p256dh=$3, auth=$4, expiration_time=$5::timestamptz, updated_at=now()
         WHERE user_id=$1 AND endpoint=$2 RETURNING id`,
        [context.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, expirationTime],
      )
      if (!updated.rows[0]) throw conflictError()
      return { id: updated.rows[0].id }
    },
  },
  unsubscribe: {
    permission: "authenticated",
    async run(context, input) {
      const endpoint = endpointInput(input)
      await context.db.query(
        "DELETE FROM moc_private.console_push_subscriptions WHERE user_id=$1 AND endpoint=$2",
        [context.userId, endpoint],
      )
      return null
    },
  },
  test: {
    permission: "authenticated",
    async run(context, input) {
      const endpoint = endpointInput(input)
      const publicKey = getWebPushPublicKey()
      if (!publicKey) throw new Error("Push notifications are not configured")
      const limit = await consumeRateLimit(
        RATE_LIMIT_POLICIES.authenticatedNotificationMutation,
        hashRateLimitSubject(["console-push-test", context.userId]),
      )
      if (!limit.allowed) throw rateLimitError()
      const result = await context.db.query<{ id: string }>(
        `SELECT id FROM moc_private.console_push_subscriptions
         WHERE user_id=$1 AND endpoint=$2
           AND (expiration_time IS NULL OR expiration_time > now())
         LIMIT 1`,
        [context.userId, endpoint],
      )
      const subscription = result.rows[0]
      if (!subscription) return { queued: false }
      const count = await enqueueConsolePush({
        userId: context.userId,
        eventKey: `console.push.test:${context.userId}:${randomUUID()}`,
        subscriptionId: subscription.id,
        payload: {
          title: "Console push is ready",
          body: "Push delivery is working.",
          url: "/",
          tag: "console-push-test",
        },
      })
      return { queued: count > 0 }
    },
  },
}
