import type { PoolClient } from "pg"
import { withActor } from "@moc/backend/database"
import { applyCors } from "../../../../server/cors.js"
import { headerValue, type ApiRequest, type ApiResponse } from "../../../../server/http.js"

type StreamResponse = ApiResponse & {
  write: (chunk: string) => boolean
  on: (event: "close", listener: () => void) => void
  flushHeaders?: () => void
  writableEnded?: boolean
}

type RevisionRow = { revision: string; change_type: "changed" | "deleted"; created_at: string }
type CursorRow = { oldest: string | null; latest: string | null; latest_type: "changed" | "deleted" | null }

const HEARTBEAT_MS = 15_000
const MAX_LIFETIME_MS = 55_000
const POLL_MS = 1_000

function header(request: ApiRequest, name: string): string | null {
  return headerValue(request.headers, name)
}

function requestedAfter(request: ApiRequest): string | null {
  const fromHeader = header(request, "last-event-id")
  const fromQuery = typeof request.query?.after === "string" ? request.query.after : null
  const candidate = fromHeader ?? fromQuery
  return candidate && /^\d+$/.test(candidate) ? candidate : null
}

async function query<Row extends import("pg").QueryResultRow>(sql: string, values: readonly unknown[]): Promise<Row[]> {
  return withActor({ userId: null, workspaceId: null, role: "moc_public" }, async (client: PoolClient) => {
    const result = await client.query<Row>(sql, [...values])
    return result.rows
  })
}

function eventFrame(event: "changed" | "deleted" | "reset", revision: string): string {
  return `id: ${revision}\nevent: ${event}\ndata: ${JSON.stringify({ revision, type: event })}\n\n`
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}

export default async function handler(request: ApiRequest, response: StreamResponse): Promise<void> {
  if (applyCors(request, response)) return
  const broadcastId = request.query?.id
  if (request.method !== "GET") {
    response.status(405).json({ error: { code: "method_not_allowed", message: "Method not allowed" } })
    return
  }
  if (typeof broadcastId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(broadcastId)) {
    response.status(400).json({ error: { code: "invalid_input", message: "Invalid broadcast id" } })
    return
  }

  response.status(200)
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  response.setHeader("Cache-Control", "no-cache, no-transform")
  response.setHeader("Connection", "keep-alive")
  response.setHeader("X-Accel-Buffering", "no")
  response.flushHeaders?.()

  const startedAt = Date.now()
  let closed = false
  let lastHeartbeatAt = startedAt
  let cursor = requestedAfter(request)
  let lastEventType: "changed" | "deleted" | "reset" | null = null
  response.on("close", () => { closed = true })

  const state = await query<CursorRow>(
    `SELECT min(revision)::text AS oldest, max(revision)::text AS latest,
       (SELECT change_type FROM public.broadcast_revisions r2 WHERE r2.broadcast_id = $1
        AND r2.created_at >= now() - interval '24 hours' ORDER BY revision DESC LIMIT 1) AS latest_type
     FROM public.broadcast_revisions r WHERE broadcast_id = $1 AND created_at >= now() - interval '24 hours'`,
    [broadcastId],
  )
  const current = state[0]
  const latest = current?.latest ?? "0"

  if (!cursor) {
    lastEventType = current?.latest_type === "deleted" ? "deleted" : "reset"
    response.write(eventFrame(lastEventType, latest))
    cursor = latest
  } else if (BigInt(cursor) > BigInt(latest) || (current?.oldest && BigInt(cursor) + 1n < BigInt(current.oldest))) {
    response.write(eventFrame("reset", latest))
    cursor = latest
  } else {
    const replay = await query<RevisionRow>(
      `SELECT revision::text, change_type, created_at::text FROM public.broadcast_revisions
       WHERE broadcast_id = $1 AND revision > $2::bigint AND created_at >= now() - interval '24 hours'
       ORDER BY revision ASC`,
      [broadcastId, cursor],
    )
    for (const revision of replay) {
      lastEventType = revision.change_type
      response.write(eventFrame(revision.change_type, revision.revision))
      cursor = revision.revision
      if (revision.change_type === "deleted") break
    }
  }

  if (lastEventType === "deleted") {
    response.end?.()
    return
  }

  while (!closed && !response.writableEnded && Date.now() - startedAt < MAX_LIFETIME_MS) {
    const revisionRows: RevisionRow[] = await query<RevisionRow>(
      `SELECT revision::text, change_type, created_at::text FROM public.broadcast_revisions
       WHERE broadcast_id = $1 AND revision > $2::bigint AND created_at >= now() - interval '24 hours'
       ORDER BY revision ASC`,
      [broadcastId, cursor ?? "0"],
    )
    for (const revision of revisionRows) {
      response.write(eventFrame(revision.change_type, revision.revision))
      cursor = revision.revision
      if (revision.change_type === "deleted") {
        response.end?.()
        return
      }
    }

    const now = Date.now()
    if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
      response.write(": heartbeat\n\n")
      lastHeartbeatAt = now
    }
    await sleep(POLL_MS)
  }
  response.end?.()
}
