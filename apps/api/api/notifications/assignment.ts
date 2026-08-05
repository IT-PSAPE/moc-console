import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { requireAuthenticatedUser, AuthError } from "../../server/auth-guard.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { resolveTemplate } from "../../server/notifications/templates.js"
import { fetchFormatSettings } from "../../server/notifications/format-settings.js"
import { enrichRequest } from "../../server/notifications/enrich.js"
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

type AssignmentKind = "request"

type Body = {
  kind: AssignmentKind
  parentId: string
  userId: string
  duty: string
}

// Once the caller has been authorized for the parent workspace, the builder
// projects the parent onto the flat {{token}} values used by the template.
// Token names must match TEMPLATE_TOKENS in the core.
type Resolved = {
  workspaceId: string
  messageType: DmMessageType
  tokens: TokenValues
}

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

function parseBody(value: unknown): Body | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  const keys = Object.keys(body)
  const allowed = new Set(["kind", "parentId", "userId", "duty"])
  if (keys.length !== 4 || keys.some((key) => !allowed.has(key))) return null

  const { kind, parentId, userId, duty } = body
  if (
    kind !== "request" ||
    !isUuid(parentId) ||
    !isUuid(userId) ||
    typeof duty !== "string" ||
    Buffer.byteLength(duty, "utf8") > 500
  ) {
    return null
  }
  return { kind, parentId, userId, duty }
}

export function assignmentEventKey(assignmentId: string): string {
  return `assignment.request:${assignmentId}`
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
  const { kind, parentId, userId, duty } = body

  // Self-assignment: skip silently — no point pinging yourself.
  if (userId === actorId) {
    response.status(200).json({ ok: true, skipped: "self" })
    return
  }

  let workspaceId: string | null
  try {
    workspaceId = await resolveRequestWorkspace(parentId)
  } catch {
    response.status(503).json({ error: "Request lookup is temporarily unavailable" })
    return
  }
  if (!workspaceId) {
    response.status(200).json({ ok: true, skipped: "parent_not_found" })
    return
  }

  try {
    await requireWorkspacePermission(actorId, workspaceId, "can_update")
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
      hashRateLimitSubject(["notification-mutation", actorId, workspaceId]),
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
    response.status(500).json({ error: "Unable to apply assignment request protection" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data: assignment, error: assignmentError } = await admin
    .from("request_assignees")
    .select("id")
    .eq("request_id", parentId)
    .eq("user_id", userId)
    .eq("duty", duty)
    .maybeSingle()
  if (assignmentError) {
    response.status(503).json({ error: "Assignment lookup is temporarily unavailable" })
    return
  }
  if (!assignment) {
    response.status(403).json({ error: "The request assignment was not found" })
    return
  }

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
    resolved = await buildRequest(workspaceId, parentId, duty, assigneeName, baseUrl)
  } catch {
    response.status(503).json({ error: "Request details are temporarily unavailable" })
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

  const eventKey = assignmentEventKey(assignment.id)
  try {
    await enqueueDelivery({
      workspaceId: resolved.workspaceId,
      eventKey,
      eventType: null,
      scope: "dm",
      recipientUserId: userId,
      chatId: user.telegram_chat_id,
      text,
      payload: { assignmentId: assignment.id, kind, parentId, userId, duty },
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
