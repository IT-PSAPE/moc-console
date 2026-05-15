import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { sendTelegramMessage } from "../../server/telegram.js"
import { requireAuthenticatedUser, AuthError } from "../../server/auth-guard.js"

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

function resolveBaseUrl(): string | null {
  const explicit = process.env.APP_BASE_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return null
}

// Telegram's HTML parser only special-cases &, <, > — quotes don't need escaping.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function buildMessage(args: {
  heading: string
  title: string
  context?: { label: string; value: string }
  duty: string
  linkUrl: string
  linkLabel: string
}): string {
  const lines: string[] = []
  lines.push(`<b>${args.heading}</b>`)
  lines.push("")
  lines.push(escapeHtml(args.title))
  if (args.context) {
    lines.push(`${args.context.label}: ${escapeHtml(args.context.value)}`)
  }
  if (args.duty) {
    lines.push(`Duty: <i>${escapeHtml(args.duty)}</i>`)
  }
  lines.push("")
  lines.push(`<a href="${args.linkUrl}">${args.linkLabel}</a>`)
  return lines.join("\n")
}

async function buildRequestMessage(
  parentId: string,
  duty: string,
  baseUrl: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from("requests")
    .select("title")
    .eq("id", parentId)
    .maybeSingle()
  if (!data) return null
  return buildMessage({
    heading: "You've been assigned to a request",
    title: data.title,
    duty,
    linkUrl: `${baseUrl}/requests/${parentId}`,
    linkLabel: "Open request",
  })
}

async function buildCueMessage(
  parentId: string,
  duty: string,
  baseUrl: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data: cue } = await admin
    .from("cues")
    .select("label, track_id")
    .eq("id", parentId)
    .maybeSingle()
  if (!cue) return null

  const { data: track } = await admin
    .from("tracks")
    .select("event_id")
    .eq("id", cue.track_id)
    .maybeSingle()
  if (!track) return null

  const { data: event } = await admin
    .from("events")
    .select("id, name")
    .eq("id", track.event_id)
    .maybeSingle()
  if (!event) return null

  return buildMessage({
    heading: "You've been assigned to a cue",
    title: cue.label,
    context: { label: "Event", value: event.name },
    duty,
    linkUrl: `${baseUrl}/cue-sheet/events/${event.id}`,
    linkLabel: "Open event",
  })
}

async function buildChecklistItemMessage(
  parentId: string,
  duty: string,
  baseUrl: string,
): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data: item } = await admin
    .from("checklist_items")
    .select("label, checklist_id")
    .eq("id", parentId)
    .maybeSingle()
  if (!item) return null

  const { data: checklist } = await admin
    .from("checklists")
    .select("id, name")
    .eq("id", item.checklist_id)
    .maybeSingle()
  if (!checklist) return null

  return buildMessage({
    heading: "You've been assigned to a checklist item",
    title: item.label,
    context: { label: "Checklist", value: checklist.name },
    duty,
    linkUrl: `${baseUrl}/cue-sheet/checklist/${checklist.id}`,
    linkLabel: "Open checklist",
  })
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
    .select("telegram_chat_id")
    .eq("id", userId)
    .maybeSingle()

  if (!user?.telegram_chat_id) {
    response.status(200).json({ ok: true, skipped: "no_telegram" })
    return
  }

  const baseUrl = resolveBaseUrl()
  if (!baseUrl) {
    response.status(200).json({ ok: true, skipped: "no_base_url" })
    return
  }

  let text: string | null = null
  if (kind === "request") {
    text = await buildRequestMessage(parentId, duty, baseUrl)
  } else if (kind === "cue") {
    text = await buildCueMessage(parentId, duty, baseUrl)
  } else {
    text = await buildChecklistItemMessage(parentId, duty, baseUrl)
  }

  if (!text) {
    response.status(200).json({ ok: true, skipped: "parent_not_found" })
    return
  }

  await sendTelegramMessage(user.telegram_chat_id, text, {
    parseMode: "HTML",
    disableLinkPreview: true,
  })
  response.status(200).json({ ok: true })
}
