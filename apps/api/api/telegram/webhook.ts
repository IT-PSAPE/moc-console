import { timingSafeEqual } from "node:crypto"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"
import {
  RATE_LIMIT_POLICIES,
  consumeRateLimit,
  hashRateLimitRequestSubject,
  hashRateLimitSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../../server/rate-limit.js"
import {
  claimTelegramWebhookUpdate,
  completeTelegramWebhookUpdate,
  failTelegramWebhookUpdate,
  getTelegramUpdateId,
} from "../../server/telegram-webhook-inbox.js"
import { processTelegramUpdate, type TelegramUpdate } from "../../server/telegram-webhook-commands.js"

function safeEqual(a: string, b: string): boolean {
  const expected = Buffer.from(a)
  const provided = Buffer.from(b)
  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}

function secretHeader(request: ApiRequest): string | null {
  const provided = request.headers?.["x-telegram-bot-api-secret-token"]
  return Array.isArray(provided) ? provided[0] ?? null : provided ?? null
}

export function telegramWebhookRateLimitSubject(request: ApiRequest): string {
  const body = request.body as { message?: { chat?: { id?: unknown } }; edited_message?: { chat?: { id?: unknown } }; my_chat_member?: { chat?: { id?: unknown } } } | null
  const chatId = body?.message?.chat?.id ?? body?.edited_message?.chat?.id ?? body?.my_chat_member?.chat?.id
  if (typeof chatId === "string" && chatId.length > 0 && chatId.length <= 64) {
    return hashRateLimitSubject(["telegram-webhook", `chat:${chatId}`])
  }
  if (typeof chatId === "number" && Number.isSafeInteger(chatId)) {
    return hashRateLimitSubject(["telegram-webhook", `chat:${chatId}`])
  }
  return hashRateLimitRequestSubject(request, ["telegram-webhook"])
}

async function handleTelegramWebhook(request: ApiRequest, response: ApiResponse): Promise<void> {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const provided = secretHeader(request)
  if (!expected || !provided || !safeEqual(expected, provided)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const updateId = getTelegramUpdateId(request.body)
  if (updateId === null) {
    response.status(400).json({ error: "Invalid Telegram update" })
    return
  }

  try {
    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.telegramWebhook,
      telegramWebhookRateLimitSubject(request),
    )
    if (!decision.allowed) {
      writeRateLimitExceeded(response, decision)
      return
    }
  } catch {
    // This policy fails closed. A retryable response lets Telegram redeliver
    // instead of accepting unprotected traffic or losing an inbound update.
    writeRateLimitUnavailable(response)
    return
  }

  try {
    const claim = await claimTelegramWebhookUpdate(updateId, request.body)
    if (claim === "processed") {
      response.status(200).json({ ok: true })
      return
    }
    if (claim === "in_progress") {
      // A duplicate has reached us while the original is still running. Ask
      // Telegram to retry instead of acknowledging an update that could still
      // be abandoned by a timed-out invocation.
      response.status(503).json({ error: "Webhook update is still processing" })
      return
    }

    await processTelegramUpdate(request.body as TelegramUpdate)
    await completeTelegramWebhookUpdate(updateId)
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    await failTelegramWebhookUpdate(updateId, error)
    // Do not acknowledge a durable processing failure. Telegram retries
    // non-2xx updates, and the inbox claim makes those retries idempotent.
    response.status(500).json({ error: "Telegram webhook processing failed" })
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("telegram.webhook", request, response, async () => {
    await handleTelegramWebhook(request, response)
  })
}
