import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { sendTelegramMessage } from "../../server/telegram.js"
import { requireAuthenticatedUser, AuthError } from "../../server/auth-guard.js"
import { resolveBaseUrl } from "../../server/base-url.js"
import { resolveTemplate } from "../../server/notifications/templates.js"
import { fetchFormatSettings } from "../../server/notifications/format-settings.js"
import { enrichRequest } from "../../server/notifications/enrich.js"
import { applyCors } from "../../server/cors.js"
import { normaliseHeaders, type ApiRequest, type ApiResponse } from "../../server/http.js"
import {
  formatDateTokens,
  renderTemplate,
  type DmMessageType,
  type TokenValues,
} from "@moc/notifications"

type AssignmentKind = "request"

type Body = {
  kind?: AssignmentKind
  parentId?: string
  userId?: string
  duty?: string
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

export default async function handler(request: ApiRequest, response: ApiResponse) {
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

  const body = (request.body ?? {}) as Body
  const { kind, parentId, userId, duty } = body

  // duty can legitimately be "", so check shape rather than truthiness.
  if (
    !kind ||
    typeof parentId !== "string" || !parentId ||
    typeof userId !== "string" || !userId ||
    typeof duty !== "string"
  ) {
    response.status(400).json({ error: "Missing fields" })
    return
  }
  if (kind !== "request") {
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

  const resolved: Resolved | null = await buildRequest(parentId, duty, assigneeName, baseUrl)

  if (!resolved) {
    response.status(200).json({ ok: true, skipped: "parent_not_found" })
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

  await sendTelegramMessage(user.telegram_chat_id, text, {
    parseMode: "HTML",
    // Link preview left enabled so the assignee gets a rich preview of
    // the link, even though its URL is hidden inside the <a> tag.
  })
  response.status(200).json({ ok: true })
}
