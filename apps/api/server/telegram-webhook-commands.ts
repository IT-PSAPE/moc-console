
import { handleCallbackQuery, type TelegramCallbackQuery } from "./telegram-callback-query.js"
import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { handleScheduledCallback, handleScheduledMessage } from './scheduled-messages/telegram-flow.js'
import { syncManagementCommands } from './scheduled-messages/commands.js'
import { syncTelegramGroupCommands } from './telegram-command-menu.js'
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

export type TelegramMessage = {
  message_id?: number
  ephemeral_message_id?: number
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
  from?: TelegramMessage['from']
  old_chat_member?: { status?: string }
  new_chat_member?: { status?: string }
}

export type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  my_chat_member?: TelegramChatMemberUpdated
  callback_query?: TelegramCallbackQuery
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

function isGroup(chat: TelegramChat | undefined): boolean {
  return chat?.type === "group" || chat?.type === "supergroup"
}

async function resolveWorkspaceBySlug(slug: string): Promise<ResolvedWorkspace | null> {
  const [row] = await queryRows<QueryResultRow & ResolvedWorkspace>("SELECT id,slug FROM public.workspaces WHERE slug=$1",[slug])
  return row ?? null
}

async function getRegisteredGroup(chatId: string): Promise<RegisteredGroup | null> {
  const [row] = await queryRows<QueryResultRow & { workspace_id:string;slug:string|null }>(
    "SELECT g.workspace_id,w.slug FROM public.telegram_groups g LEFT JOIN public.workspaces w ON w.id=g.workspace_id WHERE g.chat_id=$1",[chatId],
  )
  return row ? {workspaceId:row.workspace_id,workspaceSlug:row.slug} : null
}

async function findLinkedTelegramUser(telegramUserId: number | string | undefined): Promise<{ id: string } | null> {
  if (telegramUserId === undefined) return null
  const [user] = await queryRows<QueryResultRow & {id:string}>("SELECT id FROM public.users WHERE telegram_chat_id=$1",[String(telegramUserId)])
  return user ?? null
}

async function senderCanManageWorkspace(message: TelegramMessage, workspaceId: string): Promise<boolean> {
  const user = await findLinkedTelegramUser(message.from?.id)
  if (!user) return false

  const [membership] = await queryRows<QueryResultRow & ManagerRole>(
    "SELECT r.can_manage_roles FROM public.workspace_users w JOIN public.roles r ON r.id=w.role_id WHERE w.workspace_id=$1 AND w.user_id=$2",[workspaceId,user.id],
  )
  return membership?.can_manage_roles === true
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
  if (!chat?.id || !isGroup(chat) || !status) return

  if (!ABSENT_STATUSES.has(status)) {
    if (!['member', 'administrator'].includes(status) || update.old_chat_member?.status === status) return
    const group = await getRegisteredGroup(String(chat.id))
    const user = group ? null : await findLinkedTelegramUser(update.from?.id)
    await refreshGroupCommands(String(chat.id), group?.workspaceId, user?.id)
    return
  }

  await queryRows("UPDATE public.telegram_groups SET active=false,removed_at=now(),updated_at=now() WHERE chat_id=$1",[String(chat.id)])
}

async function refreshGroupCommands(chatId: string, workspaceId?: string, userId?: string): Promise<void> {
  try {
    const result = await syncTelegramGroupCommands(chatId, workspaceId, userId)
    if (result.failed) console.warn(`Telegram could not refresh ${result.failed} command menus for group ${chatId}.`)
  } catch (error) {
    // Menu delivery must not undo a successful registration; Console sync can retry.
    console.warn('Telegram command-menu refresh failed:', error instanceof Error ? error.message : String(error))
  }
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

  await queryRows(
    `INSERT INTO public.telegram_groups(chat_id,title,type,is_forum,workspace_id,removed_at,active)
     VALUES($1,$2,$3,$4,$5,NULL,false) ON CONFLICT(chat_id) DO UPDATE SET title=EXCLUDED.title,type=EXCLUDED.type,is_forum=EXCLUDED.is_forum,workspace_id=EXCLUDED.workspace_id,removed_at=NULL,updated_at=now()`,
    [String(chatId),chat.title??"",chat.type,chat.is_forum??false,workspace.id],
  )

  await refreshGroupCommands(String(chatId), workspace.id)
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
  if (message.forum_topic_created) {
    await queryRows(
      `INSERT INTO public.telegram_group_topics(group_chat_id,thread_id,name,closed) VALUES($1,$2,$3,false)
       ON CONFLICT(group_chat_id,thread_id) DO UPDATE SET name=EXCLUDED.name,closed=false,updated_at=now()`,
      [groupChatId,threadId,message.forum_topic_created.name??""],
    )
    return true
  }

  if (message.forum_topic_edited) {
    await queryRows("UPDATE public.telegram_group_topics SET name=$3,updated_at=now() WHERE group_chat_id=$1 AND thread_id=$2",[groupChatId,threadId,message.forum_topic_edited.name??""])
  } else {
    await queryRows("UPDATE public.telegram_group_topics SET closed=$3,updated_at=now() WHERE group_chat_id=$1 AND thread_id=$2",[groupChatId,threadId,!message.forum_topic_reopened])
  }
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

  if (registerParentGroup) {
    await queryRows("INSERT INTO public.telegram_groups(chat_id,title,type,is_forum,workspace_id,active) VALUES($1,$2,$3,$4,$5,false)",[groupChatId,chat.title??"",chat.type,chat.is_forum??true,workspace.id])
  }

  const sent = await sendMessage(chatId, "Registering topic…", { threadId, replyToMessageId: threadId })
  const resolvedName = sent?.reply_to_message?.forum_topic_created?.name?.trim()
  await queryRows(
    `INSERT INTO public.telegram_group_topics(group_chat_id,thread_id,name,closed) VALUES($1,$2,$3,false)
     ON CONFLICT(group_chat_id,thread_id) DO UPDATE SET name=EXCLUDED.name,closed=false,updated_at=now()`,
    [groupChatId,threadId,resolvedName||`Topic #${threadId}`],
  )

  await refreshGroupCommands(groupChatId, workspace.id)
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

  let linkedResult: string | null
  try {
    const [result] = await queryRows<QueryResultRow & { result:string }>(
      "SELECT public.consume_telegram_link_token($1::text,$2::text) AS result",[token,String(chatId)],
    )
    linkedResult=result?.result??null
  } catch (error) {
    if (error && typeof error==='object' && 'code' in error && error.code==='23505') {
      await sendMessage(chatId, "This Telegram account is already linked to another MOC Console user. Unlink it there first.")
      return
    }
    throw error
  }
  if (linkedResult !== "linked") {
    await sendMessage(chatId, "That link is invalid or has already been used. Open MOC Console and click \"Link Telegram\" again.")
    return
  }

  const handle = message.from?.username ? `@${message.from.username}` : "your account"
  await sendMessage(chatId, `Linked! ${handle} will now receive MOC Console notifications here.`)
  const linked = await findLinkedTelegramUser(chatId)
  if(linked) await syncManagementCommands(undefined,linked.id)
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    if (await handleScheduledCallback(update.callback_query)) return
    await handleCallbackQuery(update.callback_query)
    return
  }

  if (update.my_chat_member) {
    await handleMyChatMember(update.my_chat_member)
    return
  }

  const message = update.message ?? update.edited_message
  if (!message) return
  if (await handleScheduledMessage(message)) return
  if (await handleForumTopicMessage(message)) return
  if (await handleRegisterGroupCommand(message)) return
  if (await handleRegisterTopicCommand(message)) return
  await handleStartCommand(message)
}
