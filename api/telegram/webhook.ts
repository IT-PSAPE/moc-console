import { timingSafeEqual } from "node:crypto"
import { getSupabaseAdmin } from "../../server/supabase-admin.js"

type ApiRequest = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

type TelegramMessage = {
  chat?: { id?: number | string }
  text?: string
  from?: { username?: string }
}

const TELEGRAM_API = "https://api.telegram.org"
const START_COMMAND = /^\/start(?:\s+(\S+))?\s*$/

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

async function sendMessage(chatId: number | string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    // Telegram already received its 200; failure to reply is non-fatal.
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  const provided = request.headers?.["x-telegram-bot-api-secret-token"]
  const providedStr = Array.isArray(provided) ? provided[0] : provided

  if (!expected || !providedStr || !safeEqual(expected, providedStr)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  // From here on, always return 200 — Telegram retries non-2xx aggressively.
  try {
    const update = (request.body ?? {}) as TelegramUpdate
    const message = update.message ?? update.edited_message
    const chatId = message?.chat?.id
    const text = message?.text

    if (!message || chatId === undefined || typeof text !== "string") {
      response.status(200).json({ ok: true })
      return
    }

    const match = text.match(START_COMMAND)
    if (!match) {
      response.status(200).json({ ok: true })
      return
    }

    const token = match[1]

    if (!token) {
      await sendMessage(chatId, "Hi! To link your account, open MOC Console, go to your profile, and click \"Link Telegram\".")
      response.status(200).json({ ok: true })
      return
    }

    const admin = getSupabaseAdmin()

    const { data: row } = await admin
      .from("telegram_link_tokens")
      .select("token, user_id, expires_at")
      .eq("token", token)
      .maybeSingle()

    if (!row) {
      await sendMessage(chatId, "That link is invalid or has already been used. Open MOC Console and click \"Link Telegram\" again.")
      response.status(200).json({ ok: true })
      return
    }

    if (new Date(row.expires_at) < new Date()) {
      await admin.from("telegram_link_tokens").delete().eq("token", token)
      await sendMessage(chatId, "That link has expired. Open MOC Console and click \"Link Telegram\" again.")
      response.status(200).json({ ok: true })
      return
    }

    // Atomic single-use gate: only one concurrent webhook can win the delete.
    const { data: consumed } = await admin
      .from("telegram_link_tokens")
      .delete()
      .eq("token", token)
      .select("user_id")
      .maybeSingle()

    if (!consumed) {
      await sendMessage(chatId, "That link was already used. Open MOC Console and click \"Link Telegram\" again.")
      response.status(200).json({ ok: true })
      return
    }

    const chatIdStr = String(chatId)
    const { error: updateError } = await admin
      .from("users")
      .update({ telegram_chat_id: chatIdStr })
      .eq("id", consumed.user_id)

    if (updateError) {
      // Most likely a UNIQUE violation: this Telegram chat is already bound to another user.
      await sendMessage(chatId, "This Telegram account is already linked to another MOC Console user. Unlink it there first.")
      response.status(200).json({ ok: true })
      return
    }

    const handle = message.from?.username ? `@${message.from.username}` : "your account"
    await sendMessage(chatId, `Linked! ${handle} will now receive MOC Console notifications here.`)
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    response.status(200).json({ ok: true })
  }
}
