import type { InlineKeyboardMarkup } from "@moc/notifications"
import { toLegacyHtml } from "@moc/notifications"

import type { ProviderResponse } from "./provider-config.js"

const TELEGRAM_API = "https://api.telegram.org"
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000
const MESSAGE_NOT_MODIFIED = "message is not modified"

export type TelegramSendResult = {
  message_id?: number
  reply_to_message?: {
    forum_topic_created?: { name?: string }
  }
}

export type SendMessageOptions = {
  threadId?: number
  replyToMessageId?: number
  parseMode?: "HTML" | "MarkdownV2" | "Markdown"
  disableLinkPreview?: boolean
}

export type TelegramSendDetailed =
  | { ok: true; result: TelegramSendResult | null }
  | { ok: false; errorCode: number | null; description: string; retryAfterSeconds: number | null }

export type SendRichMessageOptions = {
  threadId?: number | null
  replyToMessageId?: number | null
  replyMarkup?: InlineKeyboardMarkup | null
  disableNotification?: boolean
}

type TelegramMethod =
  | "sendMessage"
  | "editMessageText"
  | "sendRichMessage"
  | "editMessageReplyMarkup"
  | "deleteMessage"
  | "answerCallbackQuery"

async function callTelegramApi(method: TelegramMethod, body: Record<string, unknown>): Promise<ProviderResponse> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }) as ProviderResponse
  } finally {
    clearTimeout(timeout)
  }
}

// Shared low-level request/response handling for every Telegram method: builds
// the fetch call, parses the JSON envelope, and normalises both transport and
// API-level failures into the same detailed result shape.
async function requestTelegramApi(method: TelegramMethod, body: Record<string, unknown>): Promise<TelegramSendDetailed> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, errorCode: null, description: "TELEGRAM_BOT_TOKEN not configured", retryAfterSeconds: null }
  try {
    const res = await callTelegramApi(method, body)
    const json = (await res.json()) as {
      ok?: boolean
      result?: TelegramSendResult
      error_code?: number
      description?: string
      parameters?: { retry_after?: number }
    }
    if (json.ok) return { ok: true, result: json.result ?? null }
    return {
      ok: false,
      errorCode: typeof json.error_code === "number" ? json.error_code : res.status,
      description: json.description ?? `HTTP ${res.status}`,
      retryAfterSeconds: typeof json.parameters?.retry_after === "number" ? json.parameters.retry_after : null,
    }
  } catch (error) {
    return {
      ok: false,
      errorCode: null,
      description: error instanceof Error ? error.message : String(error),
      retryAfterSeconds: null,
    }
  }
}

function isNotModified(detailed: TelegramSendDetailed): boolean {
  return !detailed.ok && detailed.description.toLowerCase().includes(MESSAGE_NOT_MODIFIED)
}

// Variant that surfaces the API error so callers (e.g. the routing
// dispatcher) can log meaningful failure context. The simpler
// `sendTelegramMessage` keeps the existing fire-and-forget contract.
export async function sendTelegramMessageDetailed(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramSendDetailed> {
  const body: Record<string, unknown> = { chat_id: chatId, text }
  if (typeof options.threadId === "number") body.message_thread_id = options.threadId
  if (options.parseMode) body.parse_mode = options.parseMode
  if (options.disableLinkPreview) {
    body.link_preview_options = { is_disabled: true }
  }
  if (typeof options.replyToMessageId === "number") {
    body.reply_parameters = {
      message_id: options.replyToMessageId,
      allow_sending_without_reply: true,
    }
  }
  return requestTelegramApi("sendMessage", body)
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramSendResult | null> {
  const result = await sendTelegramMessageDetailed(chatId, text, options)
  return result.ok ? result.result : null
}

export async function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await callTelegramApi("editMessageText", { chat_id: chatId, message_id: messageId, text })
  } catch {
    // non-fatal
  }
}

function legacyFallbackBody(chatId: number | string, html: string, replyMarkup: InlineKeyboardMarkup | null | undefined): Record<string, unknown> {
  const body: Record<string, unknown> = { chat_id: chatId, text: toLegacyHtml(html), parse_mode: "HTML" }
  if (replyMarkup) body.reply_markup = replyMarkup
  return body
}

/**
 * Sends a rich-message (block HTML) notification. Falls back once to the
 * legacy plain-text `sendMessage` when Telegram rejects the rich payload
 * (HTTP 400), e.g. because it contains a tag the API does not recognise.
 */
export async function sendTelegramRichMessage(
  chatId: number | string,
  html: string,
  options: SendRichMessageOptions = {},
): Promise<TelegramSendDetailed> {
  const body: Record<string, unknown> = { chat_id: chatId, rich_message: { html } }
  if (typeof options.threadId === "number") body.message_thread_id = options.threadId
  if (options.replyMarkup) body.reply_markup = options.replyMarkup
  if (typeof options.replyToMessageId === "number") {
    body.reply_parameters = {
      message_id: options.replyToMessageId,
      allow_sending_without_reply: true,
    }
  }
  if (options.disableNotification) body.disable_notification = true

  const sent = await requestTelegramApi("sendRichMessage", body)
  if (sent.ok || sent.errorCode !== 400) return sent

  const fallbackBody = legacyFallbackBody(chatId, html, options.replyMarkup)
  if (typeof options.threadId === "number") fallbackBody.message_thread_id = options.threadId
  if (typeof options.replyToMessageId === "number") {
    fallbackBody.reply_parameters = {
      message_id: options.replyToMessageId,
      allow_sending_without_reply: true,
    }
  }
  if (options.disableNotification) fallbackBody.disable_notification = true
  return requestTelegramApi("sendMessage", fallbackBody)
}

/**
 * Edits a previously sent rich message in place. "message is not modified" is
 * treated as success (the content already matches). Falls back once to the
 * legacy plain-text edit on HTTP 400.
 */
export async function editTelegramRichMessage(
  chatId: number | string,
  messageId: number,
  html: string,
  replyMarkup: InlineKeyboardMarkup | null,
): Promise<TelegramSendDetailed> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, rich_message: { html } }
  if (replyMarkup) body.reply_markup = replyMarkup

  const edited = await requestTelegramApi("editMessageText", body)
  if (edited.ok || isNotModified(edited)) return edited.ok ? edited : { ok: true, result: null }
  if (edited.errorCode !== 400) return edited

  const fallbackBody = legacyFallbackBody(chatId, html, replyMarkup)
  fallbackBody.message_id = messageId
  const fallback = await requestTelegramApi("editMessageText", fallbackBody)
  if (isNotModified(fallback)) return { ok: true, result: null }
  return fallback
}

export async function deleteTelegramMessage(
  chatId: number | string,
  messageId: number,
): Promise<{ ok: boolean; description?: string }> {
  const result = await requestTelegramApi("deleteMessage", { chat_id: chatId, message_id: messageId })
  return result.ok ? { ok: true } : { ok: false, description: result.description }
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  options: { text?: string; showAlert?: boolean } = {},
): Promise<void> {
  const body: Record<string, unknown> = { callback_query_id: callbackQueryId }
  if (options.text) body.text = options.text
  if (options.showAlert) body.show_alert = true
  try {
    await requestTelegramApi("answerCallbackQuery", body)
  } catch {
    // non-fatal: the user simply keeps seeing the button's loading spinner
    // briefly. Nothing durable depends on this call succeeding.
  }
}

/** Telegram bot username (without "@"), used to build Mini App deep links. */
export function getTelegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim()
  if (!raw) return null
  return raw.startsWith("@") ? raw.slice(1) : raw
}
