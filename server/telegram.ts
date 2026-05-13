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

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramSendResult | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
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
    const json = (await res.json()) as { ok?: boolean; result?: TelegramSendResult }
    return json.ok ? json.result ?? null : null
  } catch {
    return null
  }
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
