import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { sendTelegramMessage } from "../../server/telegram.js"
import { requireAuthenticatedUser, AuthError } from "../../server/auth-guard.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { resolveTemplate } from "../../server/notifications/templates.js"
import {
  enrichRequest,
  enrichCue,
  enrichChecklistItem,
} from "../../server/notifications/enrich.js"
import {
  renderTemplate,
  type DmMessageType,
  type TokenValues,
} from "../../src/data/notification-templates-core.js"

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

type AssignmentKind = "request" | "cue" | "checklist_item"

type Body = {
  kind?: AssignmentKind
  parentId?: string
  userId?: string
  duty?: string
}

function normaliseHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string | undefined> {
  if (!headers) return {}
  const out: Record<string, string | undefined> = {}
  for (const [name, value] of Object.entries(headers)) {
    out[name] = Array.isArray(value) ? value[0] : value
  }
  return out
}

// Each builder resolves the parent resource (which also yields the
// workspace the template lookup is keyed by) and returns the flat
// {{token}} values. Returns null when the parent is gone, preserving
// the old "skipped: parent_not_found" path. Token names must match
// TEMPLATE_TOKENS in the core.
type Resolved = {
  workspaceId: string
  messageType: DmMessageType
  tokens: TokenValues
}

async function buildRequest(
  parentId: string,
  duty: string,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from("requests")
    .select("workspace_id")
    .eq("id", parentId)
    .maybeSingle()
  if (!data) return null
  const enriched = await enrichRequest(parentId)
  return {
    workspaceId: data.workspace_id,
    messageType: "assignment.request",
    tokens: {
      ...enriched,
      duty,
      assigneeName,
      linkUrl: `${baseUrl}/requests/${parentId}`,
    },
  }
}

async function buildCue(
  parentId: string,
  duty: string,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved | null> {
  const enriched = await enrichCue(parentId)
  if (!enriched || !enriched.eventId) return null
  const { eventId, ...tokens } = enriched

  const admin = getSupabaseAdmin()
  const { data: event } = await admin
    .from("events")
    .select("workspace_id")
    .eq("id", eventId)
    .maybeSingle()
  if (!event) return null

  return {
    workspaceId: event.workspace_id,
    messageType: "assignment.cue",
    tokens: {
      ...tokens,
      duty,
      assigneeName,
      linkUrl: `${baseUrl}/cue-sheet/events/${eventId}`,
    },
  }
}

async function buildChecklistItem(
  parentId: string,
  duty: string,
  assigneeName: string,
  baseUrl: string,
): Promise<Resolved | null> {
  const enriched = await enrichChecklistItem(parentId)
  if (!enriched || !enriched.checklistId) return null
  const { checklistId, ...tokens } = enriched

  const admin = getSupabaseAdmin()
  const { data: checklist } = await admin
    .from("checklists")
    .select("workspace_id")
    .eq("id", checklistId)
    .maybeSingle()
  if (!checklist) return null

  return {
    workspaceId: checklist.workspace_id,
    messageType: "assignment.checklist_item",
    tokens: {
      ...tokens,
      duty,
      assigneeName,
      linkUrl: `${baseUrl}/cue-sheet/checklist/${checklistId}`,
    },
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
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

  const body = (request.body ?? {}) as Body
  const { kind, parentId, userId, duty } = body

  // duty can legitimately be "" (e.g. cue assignments start without a duty),
  // so check shape rather than truthiness.
  if (
    !kind ||
    typeof parentId !== "string" || !parentId ||
    typeof userId !== "string" || !userId ||
    typeof duty !== "string"
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }
  if (kind !== "request" && kind !== "cue" && kind !== "checklist_item") {
    response.status(400).json({ error: "Invalid kind" })
    return
  }

  // Self-assignment: skip silently — no point pinging yourself.
  if (userId === actorId) {
    response.status(200).json({ ok: true, skipped: "self" })
    return
  }

  const admin = getSupabaseAdmin()
  const { data: user } = await admin
    .from("users")
    .select("telegram_chat_id, name, surname")
    .eq("id", userId)
    .maybeSingle()

  if (!user?.telegram_chat_id) {
    response.status(200).json({ ok: true, skipped: "no_telegram" })
    return
  }

  const assigneeName = [user.name, user.surname].filter(Boolean).join(" ").trim()

  const baseUrl = resolveBaseUrl()
  if (!baseUrl) {
    response.status(200).json({ ok: true, skipped: "no_base_url" })
    return
  }

  let resolved: Resolved | null = null
  if (kind === "request") {
    resolved = await buildRequest(parentId, duty, assigneeName, baseUrl)
  } else if (kind === "cue") {
    resolved = await buildCue(parentId, duty, assigneeName, baseUrl)
  } else {
    resolved = await buildChecklistItem(parentId, duty, assigneeName, baseUrl)
  }

  if (!resolved) {
    response.status(200).json({ ok: true, skipped: "parent_not_found" })
    return
  }

  const template = await resolveTemplate(resolved.workspaceId, "dm", resolved.messageType)
  const text = renderTemplate(template, resolved.tokens)

  await sendTelegramMessage(user.telegram_chat_id, text, {
    parseMode: "HTML",
    // Link preview left enabled so the assignee gets a rich preview of
    // the link, even though its URL is hidden inside the <a> tag.
  })
  response.status(200).json({ ok: true })
}
