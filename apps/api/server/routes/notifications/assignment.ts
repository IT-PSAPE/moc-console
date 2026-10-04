import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"
import { requireAuthenticatedUser, AuthError } from "../../auth-guard.js"
import { resolveBaseUrl } from "../../base-url.js"
import { resolveTemplate } from "../../notifications/templates.js"
import { fetchFormatSettings } from "../../notifications/format-settings.js"
import { enrichChecklistItem, enrichRequest } from "../../notifications/enrich.js"
import { fetchEntityStoredStatus } from "../../notifications/entity-tokens.js"
import { applyCors } from "../../cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../http.js"
import { observeApiRequest } from "../../observability.js"
import { enqueueDelivery, processDeliveriesForEvent } from "../../notifications/delivery-store.js"
import { isUuid } from "../../notifications/signed-ingest.js"
import { getTelegramBotUsername } from "../../telegram.js"
import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../../rate-limit.js"
import { requireWorkspacePermission, WorkspaceAccessError } from "../../workspace-access.js"
import {
  buildNotificationKeyboard,
  formatDateTokens,
  renderTemplate,
  type DmMessageType,
  type InlineKeyboardMarkup,
  type TokenValues,
} from "@moc/notifications"

export type AssignmentKind = "request" | "checklist_item"

// Checklist-item assignment has no duty label, so the payload shape makes one
// structurally impossible rather than accepting and ignoring it.
type Body =
  | { kind: "request"; parentId: string; userId: string; duty: string }
  | { kind: "checklist_item"; parentId: string; userId: string }

// Once the caller has been authorized for the parent workspace, the builder
// projects the parent onto the flat {{token}} values used by the template.
// Token names must match TEMPLATE_TOKENS in the core.
type Resolved = {
  workspaceId: string
  messageType: DmMessageType
  tokens: TokenValues
  /** Drives the rich keyboard: assignment.request gets the request's action
   * buttons, assignment.checklist_item only ever gets an "Open checklist"
   * link (buildNotificationKeyboard's checklist branch takes no status). */
  entityType: "request" | "checklist"
  entityId: string
}

type ParentContext =
  | { kind: "request"; workspaceId: string }
  | { kind: "checklist_item"; workspaceId: string; checklistId: string }

async function resolveRequestWorkspace(parentId: string): Promise<string | null> {
  const [data] = await queryRows<QueryResultRow & { workspace_id: string }>(
    "SELECT workspace_id FROM public.requests WHERE id = $1 LIMIT 1",
    [parentId],
  )
  return data?.workspace_id ?? null
}

async function resolveChecklistItemParent(parentId: string): Promise<ParentContext | null> {
  const [checklist] = await queryRows<QueryResultRow & { id: string; workspace_id: string }>(
    `SELECT checklist.id, checklist.workspace_id
     FROM public.checklist_items AS item
     JOIN public.checklists AS checklist ON checklist.id = item.checklist_id
     WHERE item.id = $1 LIMIT 1`,
    [parentId],
  )
  if (!checklist) return null

  return { kind: "checklist_item", workspaceId: checklist.workspace_id, checklistId: checklist.id }
}

async function resolveParent(kind: AssignmentKind, parentId: string): Promise<ParentContext | null> {
  if (kind === "checklist_item") return resolveChecklistItemParent(parentId)
  const workspaceId = await resolveRequestWorkspace(parentId)
  return workspaceId ? { kind: "request", workspaceId } : null
}

async function buildRequest(
  workspaceId: string,
  parentId: string,
  duty: string,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved> {
  const enriched = await enrichRequest(parentId, { throwOnError: true })
  return {
    workspaceId,
    messageType: "assignment.request",
    tokens: {
      ...enriched,
      duty,
      assigneeName,
      linkUrl: `${baseUrl}/requests/${parentId}`,
    },
    entityType: "request",
    entityId: parentId,
  }
}

async function buildChecklistItem(
  workspaceId: string,
  checklistId: string,
  parentId: string,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved> {
  const enriched = await enrichChecklistItem(parentId, { throwOnError: true })
  return {
    workspaceId,
    messageType: "assignment.checklist_item",
    tokens: {
      ...enriched,
      assigneeName,
      linkUrl: `${baseUrl}/checklists/${checklistId}`,
    },
    entityType: "checklist",
    entityId: checklistId,
  }
}

async function buildAssignment(
  body: Body,
  parent: ParentContext,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved> {
  if (body.kind === "request") {
    return buildRequest(parent.workspaceId, body.parentId, body.duty, assigneeName, baseUrl)
  }
  // TypeScript cannot correlate the body and parent unions; resolveParent always
  // pairs them, so a mismatch is a bug and the caller maps the throw to a 503.
  if (parent.kind !== "checklist_item") throw new Error("Assignment parent kind mismatch")
  return buildChecklistItem(parent.workspaceId, parent.checklistId, body.parentId, assigneeName, baseUrl)
}

async function buildAssignmentKeyboard(resolved: Resolved): Promise<InlineKeyboardMarkup | null> {
  const botUsername = getTelegramBotUsername()
  if (resolved.entityType === "checklist") {
    return buildNotificationKeyboard({ entityType: "checklist", entityId: resolved.entityId }, { botUsername })
  }
  const status = await fetchEntityStoredStatus("request", resolved.entityId)
  if (status === null) return null
  return buildNotificationKeyboard({ entityType: "request", entityId: resolved.entityId, status }, { botUsername })
}

const CHECKLIST_ITEM_KEYS = new Set(["kind", "parentId", "userId"])
const REQUEST_KEYS = new Set(["kind", "parentId", "userId", "duty"])

function hasExactKeys(body: Record<string, unknown>, allowed: Set<string>): boolean {
  const keys = Object.keys(body)
  return keys.length === allowed.size && keys.every((key) => allowed.has(key))
}

function parseBody(value: unknown): Body | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const body = value as Record<string, unknown>

  const { kind, parentId, userId, duty } = body
  if ((kind !== "request" && kind !== "checklist_item") || !isUuid(parentId) || !isUuid(userId)) return null

  if (kind === "checklist_item") {
    if (!hasExactKeys(body, CHECKLIST_ITEM_KEYS)) return null
    return { kind, parentId, userId }
  }

  if (
    !hasExactKeys(body, REQUEST_KEYS) ||
    typeof duty !== "string" ||
    Buffer.byteLength(duty, "utf8") > 500
  ) {
    return null
  }
  return { kind, parentId, userId, duty }
}

export function assignmentEventKey(kind: AssignmentKind, assignmentId: string): string {
  return `assignment.${kind}:${assignmentId}`
}

async function findAssignment(body: Body): Promise<{ id: string } | null> {
  const rows = body.kind === "checklist_item"
    ? await queryRows<QueryResultRow & { id: string }>(
      `SELECT id FROM public.checklist_item_assignees
       WHERE checklist_item_id = $1 AND user_id = $2 LIMIT 1`,
      [body.parentId, body.userId],
    )
    : await queryRows<QueryResultRow & { id: string }>(
      `SELECT id FROM public.request_assignees
       WHERE request_id = $1 AND user_id = $2 AND duty = $3 LIMIT 1`,
      [body.parentId, body.userId, body.duty],
    )
  return rows[0] ?? null
}

async function handleAssignment(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (applyCors(request, response)) return
  response.setHeader("Content-Type", "application/json")

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" })
    return
  }

  let actorId: string
  try {
    const auth = await requireAuthenticatedUser(normaliseHeaders(request.headers))
    actorId = auth.userId
  } catch (error) {
    if (error instanceof AuthError) {
      response.status(401).json({ error: error.message })
      return
    }
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const body = parseBody(request.body)
  if (!body) {
    response.status(400).json({ error: "Invalid assignment payload" })
    return
  }
  const { kind, parentId, userId } = body

  // Self-assignment: skip silently — no point pinging yourself.
  if (userId === actorId) {
    response.status(200).json({ ok: true, skipped: "self" })
    return
  }

  let parent: ParentContext | null
  try {
    parent = await resolveParent(kind, parentId)
  } catch {
    response.status(503).json({ error: "Assignment parent lookup is temporarily unavailable" })
    return
  }
  if (!parent) {
    response.status(200).json({ ok: true, skipped: "parent_not_found" })
    return
  }

  try {
    await requireWorkspacePermission(actorId, parent.workspaceId, "can_update")
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      response.status(403).json({ error: "Insufficient workspace permission" })
      return
    }
    response.status(503).json({ error: "Workspace access check is temporarily unavailable" })
    return
  }

  try {
    const decision = await consumeRateLimit(
      RATE_LIMIT_POLICIES.authenticatedNotificationMutation,
      hashRateLimitSubject(["notification-mutation", actorId, parent.workspaceId]),
    )
    if (!decision.allowed) {
      writeRateLimitExceeded(response, decision)
      return
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      writeRateLimitUnavailable(response)
      return
    }
    response.status(500).json({ error: "Unable to apply assignment notification protection" })
    return
  }

  let assignment: { id: string } | null
  try {
    assignment = await findAssignment(body)
  } catch {
    response.status(503).json({ error: "Assignment lookup is temporarily unavailable" })
    return
  }
  if (!assignment) {
    response.status(403).json({ error: "The assignment was not found" })
    return
  }

  let user: (QueryResultRow & { telegram_chat_id: string | null; name: string | null; surname: string | null }) | undefined
  try {
    ;[user] = await queryRows<QueryResultRow & { telegram_chat_id: string | null; name: string | null; surname: string | null }>(
      "SELECT telegram_chat_id, name, surname FROM public.users WHERE id = $1 LIMIT 1",
      [userId],
    )
  } catch {
    response.status(503).json({ error: "Assignee lookup is temporarily unavailable" })
    return
  }
  if (!user?.telegram_chat_id) {
    response.status(200).json({ ok: true, skipped: "no_telegram" })
    return
  }

  const baseUrl = resolveBaseUrl()
  if (!baseUrl) {
    response.status(503).json({ error: "Assignment notifications are not configured" })
    return
  }

  const assigneeName = [user.name, user.surname].filter(Boolean).join(" ").trim()
  let resolved: Resolved
  try {
    resolved = await buildAssignment(body, parent, assigneeName, baseUrl)
  } catch {
    response.status(503).json({ error: "Assignment details are temporarily unavailable" })
    return
  }

  const [template, format] = await Promise.all([
    resolveTemplate(resolved.workspaceId, "dm", resolved.messageType),
    fetchFormatSettings(resolved.workspaceId),
  ])
  const text = renderTemplate(
    template,
    formatDateTokens(resolved.tokens, format.timezone, format.dateFormat),
  )

  const eventKey = assignmentEventKey(kind, assignment.id)
  const replyMarkup = await buildAssignmentKeyboard(resolved)
  try {
    await enqueueDelivery({
      workspaceId: resolved.workspaceId,
      eventKey,
      eventType: null,
      scope: "dm",
      recipientUserId: userId,
      chatId: user.telegram_chat_id,
      text,
      payload: { assignmentId: assignment.id, ...body },
      // Deliberately NOT entityType/entityId: those columns mark a
      // delivery as a follow-up-able "original" (see follow-ups.ts's
      // fetchOriginals), and an assignment DM is never one — it has no
      // *.created announcement counterpart to later edit or reply to.
      replyMarkup,
    })
    const delivery = await processDeliveriesForEvent(eventKey)
    response.status(200).json({ ok: true, ...delivery })
  } catch {
    response.status(503).json({ error: "Assignment notification is temporarily unavailable" })
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("notifications.assignment", request, response, async () => {
    await handleAssignment(request, response)
  })
}
