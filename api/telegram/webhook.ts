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
  message_id?: number
  chat?: TelegramChat
  text?: string
  from?: { username?: string }
  message_thread_id?: number
  reply_to_message?: TelegramMessage
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
const START_COMMAND = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/
const REGISTER_GROUP_COMMAND = /^\/register_group(?:@\w+)?(?:\s+(\S+))?\s*$/
const REGISTER_TOPIC_COMMAND = /^\/register_topic(?:@\w+)?(?:\s+(\S+))?\s*$/
const ABSENT_STATUSES = new Set(["left", "kicked"])

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

type SendMessageOptions = {
  threadId?: number
  replyToMessageId?: number
}

async function sendMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {},
): Promise<TelegramMessage | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const body: Record<string, unknown> = { chat_id: chatId, text }
    if (typeof options.threadId === "number") body.message_thread_id = options.threadId
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
    const json = (await res.json()) as { ok?: boolean; result?: TelegramMessage }
    return json.ok ? json.result ?? null : null
  } catch {
    // Telegram already received its 200; failure to reply is non-fatal.
    return null
  }
}

async function editMessageText(
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

// Adding the bot to a group no longer auto-creates a row — registration is
// explicit via /register_group <slug>. We only act on the *removal* path so
// that already-registered groups get soft-deleted when the bot is kicked.
async function handleMyChatMember(update: TelegramChatMemberUpdated): Promise<void> {
  const chat = update.chat
  const status = update.new_chat_member?.status
  if (!chat?.id || !chat.type || !status) return
  if (chat.type !== "group" && chat.type !== "supergroup") return
  if (!ABSENT_STATUSES.has(status)) return

  const admin = getSupabaseAdmin()
  await admin
    .from("telegram_groups")
    .update({ removed_at: new Date().toISOString() })
    .eq("chat_id", String(chat.id))
}

type ResolvedWorkspace = { id: string; slug: string }

async function resolveWorkspaceBySlug(slug: string): Promise<ResolvedWorkspace | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from("workspaces")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle()
  return data ?? null
}

function slugErrorText(providedSlug: string | null, command: string): string {
  if (!providedSlug) {
    return `Please run ${command} with a workspace slug, e.g. ${command} default-workspace`
  }
  return `Workspace "${providedSlug}" not found. Run ${command} with a valid workspace slug.`
}

async function handleRegisterGroupCommand(message: TelegramMessage): Promise<boolean> {
  const text = message.text
  if (typeof text !== "string") return false
  const match = text.match(REGISTER_GROUP_COMMAND)
  if (!match) return false

  const chat = message.chat
  const chatId = chat?.id
  if (chatId === undefined) return true

  const threadId = message.message_thread_id

  if (chat?.type !== "group" && chat?.type !== "supergroup") {
    await sendMessage(chatId, "Use /register_group inside the Telegram group you want to register.")
    return true
  }

  const slug = match[1]?.trim() || null
  if (!slug) {
    await sendMessage(chatId, slugErrorText(null, "/register_group"), { threadId })
    return true
  }

  const workspace = await resolveWorkspaceBySlug(slug)
  if (!workspace) {
    await sendMessage(chatId, slugErrorText(slug, "/register_group"), { threadId })
    return true
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin.from("telegram_groups").upsert(
    {
      chat_id: String(chatId),
      title: chat.title ?? "",
      type: chat.type,
      is_forum: chat.is_forum ?? false,
      workspace_id: workspace.id,
      removed_at: null,
    },
    { onConflict: "chat_id" },
  )

  if (error) {
    await sendMessage(chatId, `Couldn't register this group: ${error.message}`, { threadId })
    return true
  }

  await sendMessage(
    chatId,
    `✅ Registered "${chat.title ?? "this group"}" to workspace "${workspace.slug}".`,
    { threadId },
  )
  return true
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

// `/register_topic [slug]` — explicit registration of the topic the command
// was sent in. If the parent group isn't registered yet, the slug is required
// and registers both the group and the topic against that workspace. If the
// group is already registered, the topic inherits its workspace and the slug
// (if provided) must match — otherwise we tell the caller.
//
// Name resolution: the Telegram Bot API has no method to look up a topic's
// name. Trick: the topic root message id == message_thread_id, and that root
// is always a `forum_topic_created` service message. By replying to it we coax
// Telegram into returning that service message in the response's
// `reply_to_message`, which carries the real topic name.
async function handleRegisterTopicCommand(message: TelegramMessage): Promise<boolean> {
  const text = message.text
  if (typeof text !== "string") return false
  const match = text.match(REGISTER_TOPIC_COMMAND)
  if (!match) return false

  const chat = message.chat
  const chatId = chat?.id
  if (chatId === undefined) return true

  if (chat?.type !== "group" && chat?.type !== "supergroup") {
    await sendMessage(chatId, "Use /register_topic inside a Telegram group, in the topic you want to register.")
    return true
  }

  const threadId = message.message_thread_id
  if (typeof threadId !== "number") {
    await sendMessage(chatId, "Run /register_topic from inside a forum topic. Messages sent without a topic id go to General.")
    return true
  }

  const groupChatId = String(chatId)
  const admin = getSupabaseAdmin()
  const providedSlug = match[1]?.trim() || null

  // Look up the parent group.
  const { data: existingGroup } = await admin
    .from("telegram_groups")
    .select("workspace_id, workspaces(slug)")
    .eq("chat_id", groupChatId)
    .maybeSingle()

  type GroupRow = { workspace_id: string; workspaces: { slug: string } | { slug: string }[] | null }
  const existing = existingGroup as GroupRow | null
  const existingSlug = existing
    ? Array.isArray(existing.workspaces)
      ? existing.workspaces[0]?.slug
      : existing.workspaces?.slug
    : undefined

  let workspaceId: string
  let workspaceSlug: string

  if (existing) {
    workspaceId = existing.workspace_id
    workspaceSlug = existingSlug ?? ""
    if (providedSlug && providedSlug !== workspaceSlug) {
      await sendMessage(
        chatId,
        `This group is already registered to workspace "${workspaceSlug}". To move it, run /register_group ${providedSlug} first.`,
        { threadId },
      )
      return true
    }
  } else {
    if (!providedSlug) {
      await sendMessage(
        chatId,
        "This group isn't registered yet. Run /register_group <slug> first, or /register_topic <slug> to register both at once.",
        { threadId },
      )
      return true
    }
    const workspace = await resolveWorkspaceBySlug(providedSlug)
    if (!workspace) {
      await sendMessage(chatId, slugErrorText(providedSlug, "/register_topic"), { threadId })
      return true
    }
    workspaceId = workspace.id
    workspaceSlug = workspace.slug

    const { error: groupErr } = await admin.from("telegram_groups").insert({
      chat_id: groupChatId,
      title: chat.title ?? "",
      type: chat.type,
      is_forum: chat.is_forum ?? true,
      workspace_id: workspaceId,
      removed_at: null,
    })
    if (groupErr) {
      await sendMessage(chatId, `Couldn't register this group: ${groupErr.message}`, { threadId })
      return true
    }
  }

  // Reply to the topic root to fetch the real topic name from Telegram.
  const sent = await sendMessage(chatId, "Registering topic…", {
    threadId,
    replyToMessageId: threadId,
  })

  const resolvedName = sent?.reply_to_message?.forum_topic_created?.name?.trim()

  await admin.from("telegram_group_topics").upsert(
    {
      group_chat_id: groupChatId,
      thread_id: threadId,
      name: resolvedName || `Topic #${threadId}`,
      closed: false,
    },
    { onConflict: "group_chat_id,thread_id" },
  )

  if (sent?.message_id !== undefined) {
    const finalText = resolvedName
      ? `✅ Registered "${resolvedName}" in workspace "${workspaceSlug}".`
      : `✅ Registered topic #${threadId} in workspace "${workspaceSlug}". (Couldn't read the topic name — rename it in Telegram and I'll pick it up.)`
    await editMessageText(chatId, sent.message_id, finalText)
  }

  return true
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

    if (await handleRegisterGroupCommand(message)) {
      response.status(200).json({ ok: true })
      return
    }

    if (await handleRegisterTopicCommand(message)) {
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
