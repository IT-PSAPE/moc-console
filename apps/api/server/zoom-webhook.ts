import { createHmac, timingSafeEqual } from "node:crypto"

import { headerValue, type ApiRequest } from "./http.js"

const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60
const ZOOM_SIGNATURE_PREFIX = "v0="

type ZoomWebhookPayload = {
  plainToken?: unknown
  user_id?: unknown
}

type ZoomWebhookEvent = {
  event?: unknown
  payload?: ZoomWebhookPayload
}

function safelyEquals(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

function webhookTimestamp(request: ApiRequest): string | null {
  const timestamp = headerValue(request.headers, "x-zm-request-timestamp")
  if (!timestamp || !/^\d{10}$/.test(timestamp)) return null
  const seconds = Number(timestamp)
  if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() - seconds * 1000) > MAX_TIMESTAMP_AGE_SECONDS * 1000) return null
  return timestamp
}

function eventBody(body: unknown): ZoomWebhookEvent | null {
  return body && typeof body === "object" && !Array.isArray(body) ? body as ZoomWebhookEvent : null
}

export function zoomWebhookSignature(secret: string, timestamp: string, body: unknown): string {
  return `${ZOOM_SIGNATURE_PREFIX}${createHmac("sha256", secret).update(`v0:${timestamp}:${JSON.stringify(body)}`).digest("hex")}`
}

export function verifyZoomWebhook(request: ApiRequest, secret: string): boolean {
  const signature = headerValue(request.headers, "x-zm-signature")
  const timestamp = webhookTimestamp(request)
  if (!signature || !timestamp || !eventBody(request.body)) return false
  return safelyEquals(zoomWebhookSignature(secret, timestamp, request.body), signature)
}

export function zoomValidationPlainToken(body: unknown): string | null {
  const event = eventBody(body)
  const plainToken = event?.event === "endpoint.url_validation" ? event.payload?.plainToken : null
  return typeof plainToken === "string" && plainToken.length > 0 && plainToken.length <= 512 ? plainToken : null
}

export function zoomDeauthorizedUserId(body: unknown): string | null {
  const event = eventBody(body)
  const userId = event?.event === "app_deauthorized" ? event.payload?.user_id : null
  return typeof userId === "string" && userId.length > 0 && userId.length <= 512 ? userId : null
}

export function zoomValidationEncryptedToken(secret: string, plainToken: string): string {
  return createHmac("sha256", secret).update(plainToken).digest("hex")
}
