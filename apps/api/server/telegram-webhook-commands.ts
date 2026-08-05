import { getSupabaseAdmin } from "./supabase-admin.js"
import {
  editTelegramMessageText,
  sendTelegramMessage,
  type SendMessageOptions,
  type TelegramSendResult,
} from "./telegram.js"

type TelegramChat = {
  id?: number | string
  type?: "private" | "group" | "supergroup" | "channel"
  title?: string
  is_forum?: boolean
}

type TelegramMessage = {
  message_id?: number
  chat?: TelegramChat
  text?: string
  from?: { id?: number | string; username?: string }
  message_thread_id?: number
  reply_to_message?: TelegramMessage
  forum_topic_created?: { name?: string }
  forum_topic_edited?: { name?: string }
  forum_topic_closed?: Record<string, never>
  forum_topic_reopened?: Record<string, never>
}

type TelegramChatMemberUpdated = {
  chat?: TelegramChat
  new_chat_member?: { status?: string }
}

export type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  my_chat_member?: TelegramChatMemberUpdated
}

type ResolvedWorkspace = { id: string; slug: string }
type RegisteredGroup = { workspaceId: string; workspaceSlug: string | null }
type ManagerRole = { can_manage_roles: boolean }

const START_COMMAND = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/
const REGISTER_GROUP_COMMAND = /^\/register_group(?:@\w+)?(?:\s+(\S+))?\s*$/
const REGISTER_TOPIC_COMMAND = /^\/register_topic(?:@\w+)?(?:\s+(\S+))?\s*$/
const ABSENT_STATUSES = new Set(["left", "kicked"])

async function sendMessage(chatId: number | string, text: string, options: SendMessageOptions = {}): Promise<TelegramSendResult | null> {
  return sendTelegramMessage(chatId, text, options)
}

function throwIfError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`)
}

function isGroup(chat: TelegramChat | undefined): boolean {
  return chat?.type === "group" || chat?.type === "supergroup"
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value
}

async function resolveWorkspaceBySlug(slug: string): Promise<ResolvedWorkspace | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from("workspaces").select("id, slug").eq("slug", slug).maybeSingle()
  throwIfError(error, "Could not resolve workspace")
  return data
}

async function getRegisteredGroup(chatId: string): Promise<RegisteredGroup | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("telegram_groups")
    .select("workspace_id, workspaces(slug)")
    .eq("chat_id", chatId)
    .maybeSingle()
  throwIfError(error, "Could not load Telegram group")

  if (!data) return null
  const row = data as { workspace_id: string; workspaces: { slug: string } | { slug: string }[] | null }
  const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces
  return { workspaceId: row.workspace_id, workspaceSlug: workspace?.slug ?? null }
}

async function senderCanManageWorkspace(message: TelegramMessage, workspaceId: string): Promise<boolean> {
  const telegramUserId = message.from?.id
  if (telegramUserId === undefined) return false

  const admin = getSupabaseAdmin()
  const { data: user, error: userError } = await admin
    .from("users")
    .select("id")
    .eq("telegram_chat_id", String(telegramUserId))
    .maybeSingle()
  throwIfError(userError, "Could not resolve linked Telegram user")
  if (!user) return false

  const { data: membership, error: membershipError } = await admin
    .from("workspace_users")
    .select("roles(can_manage_roles)")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()
  throwIfError(membershipError, "Could not check workspace permission")

  type MembershipRow = { roles: ManagerRole | ManagerRole[] | null }
  const roles = first((membership as MembershipRow | null)?.roles ?? null)
  return roles?.can_manage_roles === true
}

async function rejectUnauthorizedSender(message: TelegramMessage, workspaceId: string, chatId: number | string, threadId?: number): Promise<boolean> {
  if (await senderCanManageWorkspace(message, workspaceId)) return false
  await sendMessage(chatId, "Link your Telegram account and ask a workspace manager to grant you integration-management permission before registering groups or topics.", { threadId })
  return true
}

function slugErrorText(providedSlug: string | null, command: string): string {
  if (!providedSlug) return `Please run ${command} with a workspace slug, e.g. ${command} default-workspace`
  return `Workspace "${providedSlug}" not found. Run ${command} with a valid workspace slug.`
}

async function handleMyChatMember(update: TelegramChatMemberUpdated): Promise<void> {
  const chat = update.chat
  const status = update.new_chat_member?.status
  if (!chat?.id || !isGroup(chat) || !status || !ABSENT_STATUSES.has(status)) return

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("telegram_groups")
    .update({ removed_at: new Date().toISOString() })
    .eq("chat_id", String(chat.id))
  throwIfError(error, "Could not mark Telegram group as removed")
}

async function handleRegisterGroupCommand(message: TelegramMessage): Promise<boolean> {
  const match = message.text?.match(REGISTER_GROUP_COMMAND)
  if (!match) return false

  const chat = message.chat
  const chatId = chat?.id
  if (chatId === undefined) return true
  const threadId = message.message_thread_id

  if (!chat || !isGroup(chat)) {
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

  const existing = await getRegisteredGroup(String(chatId))
  if (await rejectUnauthorizedSender(message, workspace.id, chatId, threadId)) return true
  if (existing && existing.workspaceId !== workspace.id && await rejectUnauthorizedSender(message, existing.workspaceId, chatId, threadId)) return true

  const admin = getSupabaseAdmin()
  const { error } = await admin.from("telegram_groups").upsert({
    chat_id: String(chatId),
    title: chat.title ?? "",
    type: chat.type,
    is_forum: chat.is_forum ?? false,
    workspace_id: workspace.id,
    removed_at: null,
  }, { onConflict: "chat_id" })
  throwIfError(error, "Could not register Telegram group")

  await sendMessage(chatId, `✅ Registered "${chat.title ?? "this group"}" to workspace "${workspace.slug}".`, { threadId })
  return true
}

async function handleForumTopicMessage(message: TelegramMessage): Promise<boolean> {
  const chat = message.chat
  const threadId = message.message_thread_id
  if (!chat?.id || typeof threadId !== "number") return false
  if (!message.forum_topic_created && !message.forum_topic_edited && !message.forum_topic_closed && !message.forum_topic_reopened) return false

  const groupChatId = String(chat.id)
  if (!await getRegisteredGroup(groupChatId)) return true
  const admin = getSupabaseAdmin()

  if (message.forum_topic_created) {
    const { error } = await admin.from("telegram_group_topics").upsert({
      group_chat_id: groupChatId,
      thread_id: threadId,
      name: message.forum_topic_created.name ?? "",
      closed: false,
    }, { onConflict: "group_chat_id,thread_id" })
    throwIfError(error, "Could not record Telegram topic")
    return true
  }

  const update = message.forum_topic_edited
    ? { name: message.forum_topic_edited.name ?? "" }
    : { closed: !message.forum_topic_reopened }
  const { error } = await admin
    .from("telegram_group_topics")
    .update(update)
    .eq("group_chat_id", groupChatId)
    .eq("thread_id", threadId)
  throwIfError(error, "Could not update Telegram topic")
  return true
}

async function handleRegisterTopicCommand(message: TelegramMessage): Promise<boolean> {
  const match = message.text?.match(REGISTER_TOPIC_COMMAND)
  if (!match) return false

  const chat = message.chat
  const chatId = chat?.id
  if (chatId === undefined) return true
  if (!chat || !isGroup(chat)) {
    await sendMessage(chatId, "Use /register_topic inside a Telegram group, in the topic you want to register.")
    return true
  }

  const threadId = message.message_thread_id
  if (typeof threadId !== "number") {
    await sendMessage(chatId, "Run /register_topic from inside a forum topic. Messages sent without a topic id go to General.")
    return true
  }

  const providedSlug = match[1]?.trim() || null
  const groupChatId = String(chatId)
  const existing = await getRegisteredGroup(groupChatId)
  let workspace: ResolvedWorkspace | null = null
  let registerParentGroup = false

  if (existing) {
    if (await rejectUnauthorizedSender(message, existing.workspaceId, chatId, threadId)) return true
    if (providedSlug && providedSlug !== existing.workspaceSlug) {
      await sendMessage(chatId, `This group is already registered to workspace "${existing.workspaceSlug ?? "unknown"}". To move it, run /register_group ${providedSlug} first.`, { threadId })
      return true
    }
    workspace = { id: existing.workspaceId, slug: existing.workspaceSlug ?? "" }
  } else {
    if (!providedSlug) {
      await sendMessage(chatId, "This group isn't registered yet. Run /register_group <slug> first, or /register_topic <slug> to register both at once.", { threadId })
      return true
    }
    workspace = await resolveWorkspaceBySlug(providedSlug)
    if (!workspace) {
      await sendMessage(chatId, slugErrorText(providedSlug, "/register_topic"), { threadId })
      return true
    }
    if (await rejectUnauthorizedSender(message, workspace.id, chatId, threadId)) return true
    registerParentGroup = true
  }

  const admin = getSupabaseAdmin()
  if (registerParentGroup) {
    const { error } = await admin.from("telegram_groups").insert({
      chat_id: groupChatId,
      title: chat.title ?? "",
      type: chat.type,
      is_forum: chat.is_forum ?? true,
      workspace_id: workspace.id,
      removed_at: null,
    })
    throwIfError(error, "Could not register Telegram group")
  }

  const sent = await sendMessage(chatId, "Registering topic…", { threadId, replyToMessageId: threadId })
  const resolvedName = sent?.reply_to_message?.forum_topic_created?.name?.trim()
  const { error } = await admin.from("telegram_group_topics").upsert({
    group_chat_id: groupChatId,
    thread_id: threadId,
    name: resolvedName || `Topic #${threadId}`,
    closed: false,
  }, { onConflict: "group_chat_id,thread_id" })
  throwIfError(error, "Could not register Telegram topic")

  if (sent?.message_id !== undefined) {
    const finalText = resolvedName
      ? `✅ Registered "${resolvedName}" in workspace "${workspace.slug}".`
      : `✅ Registered topic #${threadId} in workspace "${workspace.slug}". (Couldn't read the topic name — rename it in Telegram and I'll pick it up.)`
    await editTelegramMessageText(chatId, sent.message_id, finalText)
  }
  return true
}

async function handleStartCommand(message: TelegramMessage): Promise<void> {
  const chatId = message.chat?.id
  const match = message.text?.match(START_COMMAND)
  if (chatId === undefined || !match || (message.chat?.type && message.chat.type !== "private")) return

  const token = match[1]
  if (!token) {
    await sendMessage(chatId, "Hi! To link your account, open MOC Console, go to your profile, and click \"Link Telegram\".")
    return
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc("consume_telegram_link_token", {
    p_token: token,
    p_telegram_chat_id: String(chatId),
  })
  if (error?.code === "23505") {
    await sendMessage(chatId, "This Telegram account is already linked to another MOC Console user. Unlink it there first.")
    return
  }
  throwIfError(error, "Could not link Telegram account")
  if (data !== "linked") {
    await sendMessage(chatId, "That link is invalid or has already been used. Open MOC Console and click \"Link Telegram\" again.")
    return
  }

  const handle = message.from?.username ? `@${message.from.username}` : "your account"
  await sendMessage(chatId, `Linked! ${handle} will now receive MOC Console notifications here.`)
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.my_chat_member) {
    await handleMyChatMember(update.my_chat_member)
    return
  }

  const message = update.message ?? update.edited_message
  if (!message) return
  if (await handleForumTopicMessage(message)) return
  if (await handleRegisterGroupCommand(message)) return
  if (await handleRegisterTopicCommand(message)) return
  await handleStartCommand(message)
}
