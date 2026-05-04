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

type TelegramChat = {
  id?: number | string
  type?: "private" | "group" | "supergroup" | "channel"
  title?: string
  is_forum?: boolean
}

type TelegramForumTopicCreated = { name?: string }
type TelegramForumTopicEdited = { name?: string }

type TelegramMessage = {
  chat?: TelegramChat
  text?: string
  from?: { username?: string }
  message_thread_id?: number
  forum_topic_created?: TelegramForumTopicCreated
  forum_topic_edited?: TelegramForumTopicEdited
  forum_topic_closed?: Record<string, never>
  forum_topic_reopened?: Record<string, never>
}

type TelegramChatMemberUpdated = {
  chat?: TelegramChat
  new_chat_member?: { status?: string }
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  my_chat_member?: TelegramChatMemberUpdated
}

const TELEGRAM_API = "https://api.telegram.org"
const START_COMMAND = /^\/start(?:\s+(\S+))?\s*$/
const PRESENT_STATUSES = new Set(["member", "administrator", "creator", "restricted"])
const ABSENT_STATUSES = new Set(["left", "kicked"])

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

async function handleMyChatMember(update: TelegramChatMemberUpdated): Promise<void> {
  const chat = update.chat
  const status = update.new_chat_member?.status
  if (!chat?.id || !chat.type || !status) return
  if (chat.type !== "group" && chat.type !== "supergroup") return

  const admin = getSupabaseAdmin()
  const chatIdStr = String(chat.id)

  if (PRESENT_STATUSES.has(status)) {
    await admin.from("telegram_groups").upsert(
      {
        chat_id: chatIdStr,
        title: chat.title ?? "",
        type: chat.type,
        is_forum: chat.is_forum ?? false,
        removed_at: null,
      },
      { onConflict: "chat_id" },
    )
    return
  }

  if (ABSENT_STATUSES.has(status)) {
    await admin
      .from("telegram_groups")
      .update({ removed_at: new Date().toISOString() })
      .eq("chat_id", chatIdStr)
  }
}

async function handleForumTopicMessage(message: TelegramMessage): Promise<boolean> {
  const chat = message.chat
  const threadId = message.message_thread_id
  if (!chat?.id || typeof threadId !== "number") return false

  const admin = getSupabaseAdmin()
  const groupChatId = String(chat.id)

  if (message.forum_topic_created) {
    await admin.from("telegram_group_topics").upsert(
      {
        group_chat_id: groupChatId,
        thread_id: threadId,
        name: message.forum_topic_created.name ?? "",
        closed: false,
      },
      { onConflict: "group_chat_id,thread_id" },
    )
    return true
  }

  if (message.forum_topic_edited) {
    const patch: { name?: string } = {}
    if (typeof message.forum_topic_edited.name === "string") {
      patch.name = message.forum_topic_edited.name
    }
    if (Object.keys(patch).length > 0) {
      await admin
        .from("telegram_group_topics")
        .update(patch)
        .eq("group_chat_id", groupChatId)
        .eq("thread_id", threadId)
    }
    return true
  }

  if (message.forum_topic_closed) {
    await admin
      .from("telegram_group_topics")
      .update({ closed: true })
      .eq("group_chat_id", groupChatId)
      .eq("thread_id", threadId)
    return true
  }

  if (message.forum_topic_reopened) {
    await admin
      .from("telegram_group_topics")
      .update({ closed: false })
      .eq("group_chat_id", groupChatId)
      .eq("thread_id", threadId)
    return true
  }

  return false
}

async function handleStartCommand(message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id
  const text = message.text
  if (chatId === undefined || typeof text !== "string") return

  // Linking is a private-chat flow only — ignore /start in groups.
  if (message.chat?.type && message.chat.type !== "private") return

  const match = text.match(START_COMMAND)
  if (!match) return

  const token = match[1]

  if (!token) {
    await sendMessage(chatId, "Hi! To link your account, open MOC Console, go to your profile, and click \"Link Telegram\".")
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
    return
  }

  if (new Date(row.expires_at) < new Date()) {
    await admin.from("telegram_link_tokens").delete().eq("token", token)
    await sendMessage(chatId, "That link has expired. Open MOC Console and click \"Link Telegram\" again.")
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
    return
  }

  const handle = message.from?.username ? `@${message.from.username}` : "your account"
  await sendMessage(chatId, `Linked! ${handle} will now receive MOC Console notifications here.`)
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

    if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member)
      response.status(200).json({ ok: true })
      return
    }

    const message = update.message ?? update.edited_message
    if (!message) {
      response.status(200).json({ ok: true })
      return
    }

    const handled = await handleForumTopicMessage(message)
    if (handled) {
      response.status(200).json({ ok: true })
      return
    }

    await handleStartCommand(message)
    response.status(200).json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    response.status(200).json({ ok: true })
  }
}
