// Resolves who a group-scope announcement dispatch actually sends to: either
// the workspace's configured notification_routes, or a caller-supplied
// override. Split out of dispatch.ts to keep that file under the size limit.

import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"

export type RouteRow = QueryResultRow & {
  id: string
  group_chat_id: string | null
  thread_id: number | null
  user_id: string | null
  telegram_groups: { active: boolean; removed_at: string | null } | null
  users: { telegram_chat_id: string | null } | { telegram_chat_id: string | null }[] | null
}

// A Telegram delivery target. Mirrors notification_routes' (group_chat_id,
// thread_id) pair, so a configured route and a caller-supplied override
// address a destination identically.
export type NotifyDestination = {
  groupChatId: string
  threadId: number | null
}

// A route now resolves to either a group/topic post or one person's DM —
// notification_routes enforces exactly one target (group_chat_id XOR
// user_id) at the database level; this union mirrors that at the type level
// instead of carrying nullable fields both branches would have to guard.
export type GroupTarget = {
  kind: "group"
  /** notification_routes.id, or "" for an override (no route row behind it). */
  routeId: string
  groupChatId: string
  threadId: number | null
}

export type DmTarget = {
  kind: "dm"
  routeId: string
  userId: string
  chatId: string
}

export type Target = GroupTarget | DmTarget

export type DmRouteResolution =
  | { kind: "target"; target: DmTarget }
  | { kind: "skip_unlinked"; userId: string }

// Pure so the unlinked-user skip is directly testable without a DB: given a
// user-targeted route and that user's telegram_chat_id (already looked up),
// decide whether it becomes a send target or a visible skip. A null/empty
// chat id means the person has never linked Telegram.
export function resolveDmRouteTarget(
  routeId: string,
  userId: string,
  telegramChatId: string | null,
): DmRouteResolution {
  if (!telegramChatId) return { kind: "skip_unlinked", userId }
  return { kind: "target", target: { kind: "dm", routeId, userId, chatId: telegramChatId } }
}

/**
 * Turns caller-supplied destinations into send targets, keeping only those
 * that are genuinely registered to this workspace.
 *
 * Destinations arrive from a browser, so none of it is trusted: a chat id is
 * usable only if it belongs to an active, non-removed telegram_group of this
 * workspace, and a thread id only if that topic exists on that group and is
 * open. Anything else is dropped — the caller gets a count back and can see
 * that fewer messages went out than it asked for.
 */
export async function resolveOverrideTargets(
  workspaceId: string,
  destinations: readonly NotifyDestination[],
): Promise<Target[]> {
  const chatIds = [...new Set(destinations.map((d) => d.groupChatId))]
  if (chatIds.length === 0) return []
  type GroupRow = QueryResultRow & {
    chat_id: string
    active: boolean
    removed_at: string | null
    telegram_group_topics: { thread_id: number; closed: boolean }[] | null
  }
  const data = await queryRows<GroupRow>(
    `SELECT groups.chat_id, groups.active, groups.removed_at,
       coalesce(jsonb_agg(jsonb_build_object('thread_id', topics.thread_id, 'closed', topics.closed))
         FILTER (WHERE topics.thread_id IS NOT NULL), '[]'::jsonb) AS telegram_group_topics
     FROM public.telegram_groups AS groups
     LEFT JOIN public.telegram_group_topics AS topics ON topics.group_chat_id = groups.chat_id
     WHERE groups.workspace_id = $1 AND groups.chat_id = ANY($2::text[])
     GROUP BY groups.chat_id, groups.active, groups.removed_at`,
    [workspaceId, chatIds],
  )

  const groups = new Map<string, GroupRow>()
  for (const row of data) {
    if (row.active !== true || row.removed_at) continue
    groups.set(row.chat_id, row)
  }

  const seen = new Set<string>()
  const targets: Target[] = []

  for (const destination of destinations) {
    const group = groups.get(destination.groupChatId)
    if (!group) continue

    if (destination.threadId !== null) {
      const topic = (group.telegram_group_topics ?? []).find(
        (t) => t.thread_id === destination.threadId,
      )
      if (!topic || topic.closed) continue
    }

    const key = `${destination.groupChatId}:${destination.threadId ?? "main"}`
    if (seen.has(key)) continue
    seen.add(key)

    targets.push({
      kind: "group",
      routeId: "",
      groupChatId: destination.groupChatId,
      threadId: destination.threadId,
    })
  }

  return targets
}
