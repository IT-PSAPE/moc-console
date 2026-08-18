import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { requireAuthenticatedUser, AuthError } from "../../server/auth-guard.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { resolveTemplate } from "../../server/notifications/templates.js"
import { fetchFormatSettings } from "../../server/notifications/format-settings.js"
import { enrichChecklistItem, enrichRequest } from "../../server/notifications/enrich.js"
import { applyCors } from "../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"
import { enqueueDelivery, processDeliveriesForEvent } from "../../server/notifications/delivery-store.js"
import { isUuid } from "../../server/notifications/signed-ingest.js"
import {
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  consumeRateLimit,
  hashRateLimitSubject,
  writeRateLimitExceeded,
  writeRateLimitUnavailable,
} from "../../server/rate-limit.js"
import { requireWorkspacePermission, WorkspaceAccessError } from "../../server/workspace-access.js"
import {
  formatDateTokens,
  renderTemplate,
  type DmMessageType,
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
}

type ParentContext =
  | { kind: "request"; workspaceId: string }
  | { kind: "checklist_item"; workspaceId: string; checklistId: string }

async function resolveRequestWorkspace(parentId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("requests")
    .select("workspace_id")
    .eq("id", parentId)
    .maybeSingle()
  if (error) throw new Error("Request lookup failed")
  return data?.workspace_id ?? null
}

async function resolveChecklistItemParent(parentId: string): Promise<ParentContext | null> {
  const admin = getSupabaseAdmin()
  const { data: item, error: itemError } = await admin
    .from("checklist_items")
    .select("checklist_id")
    .eq("id", parentId)
    .maybeSingle()
  if (itemError) throw new Error("Checklist item lookup failed")
  if (!item) return null

  const { data: checklist, error: checklistError } = await admin
    .from("checklists")
    .select("id, workspace_id")
    .eq("id", item.checklist_id)
    .maybeSingle()
  if (checklistError) throw new Error("Checklist lookup failed")
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
  const admin = getSupabaseAdmin()
  const query = body.kind === "checklist_item"
    ? admin
      .from("checklist_item_assignees")
      .select("id")
      .eq("checklist_item_id", body.parentId)
    : admin
      .from("request_assignees")
      .select("id")
      .eq("request_id", body.parentId)
      .eq("duty", body.duty)
  const { data, error } = await query
    .eq("user_id", body.userId)
    .maybeSingle()
  if (error) throw new Error("Assignment lookup failed")
  return data
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

  const admin = getSupabaseAdmin()
  const { data: user, error: userError } = await admin
    .from("users")
    .select("telegram_chat_id, name, surname")
    .eq("id", userId)
    .maybeSingle()
  if (userError) {
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
