const TELEGRAM_API = "https://api.telegram.org"

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
  | { ok: false; errorCode: number | null; description: string }

// Variant that surfaces the API error so callers (e.g. the routing
// dispatcher) can log meaningful failure context. The simpler
// `sendTelegramMessage` keeps the existing fire-and-forget contract.
export async function sendTelegramMessageDetailed(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramSendDetailed> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, errorCode: null, description: "TELEGRAM_BOT_TOKEN not configured" }
  try {
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
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as {
      ok?: boolean
      result?: TelegramSendResult
      error_code?: number
      description?: string
    }
    if (json.ok) return { ok: true, result: json.result ?? null }
    return {
      ok: false,
      errorCode: typeof json.error_code === "number" ? json.error_code : null,
      description: json.description ?? `HTTP ${res.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      errorCode: null,
      description: error instanceof Error ? error.message : String(error),
    }
  }
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
    await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
    })
  } catch {
    // non-fatal
  }
}
