import { describe, expect, test as bunTest } from "bun:test"
import type { QueryResultRow } from "pg"
import type { ApiRequest, ApiResponse } from "../../../../apps/api/server/http"
import { runWithSqlFixture, setSqlFixture } from "./sql-fixture.js"

type Revision = { revision: string; change_type: "changed" | "deleted"; created_at: string }
let oldestRevision = "5"
let latestRevision = "6"
let replay: Revision[] = []
const queries: string[] = []
function test(name: string, body: () => Promise<void>): void {
  bunTest(name, () => runWithSqlFixture(body))
}

const { default: handler } = await import("../../../../apps/api/api/public/broadcasts/[id]/events")

function createResponse() {
  const frames: string[] = []
  let closeListener = () => undefined
  let ended = false
  const response = {
    status() { return this },
    json() {},
    setHeader() {},
    flushHeaders() {},
    on(_event: "close", listener: () => void) { closeListener = listener },
    write(frame: string) {
      frames.push(frame)
      if (frame.includes("event: ")) closeListener()
      return true
    },
    end() { ended = true },
  }
  return { frames, response: response as unknown as ApiResponse & { write: (frame: string) => boolean; on: (event: "close", listener: () => void) => void; flushHeaders: () => void; writableEnded?: boolean; end: () => void }, get ended() { return ended } }
}

describe("public broadcast event stream", () => {
  test("replays committed changes after the caller's cursor", async () => {
    oldestRevision = "5"
    latestRevision = "6"
    replay = [{ revision: "6", change_type: "changed", created_at: "2026-10-04T10:00:00.000Z" }]
    queries.length = 0
    const target = createResponse()
    const request: ApiRequest = { method: "GET", query: { id: "33333333-3333-4333-8333-333333333333" }, headers: { "Last-Event-ID": "5" } }

    setSqlFixture({ queryRows: async (sql) => {
      queries.push(sql)
      if (sql.includes("SELECT min(revision)")) return [{ oldest: oldestRevision, latest: latestRevision, latest_type: "changed" } as QueryResultRow]
      return replay as unknown as QueryResultRow[]
    } })

    await handler(request, target.response)

    expect(target.frames).toEqual(['id: 6\nevent: changed\ndata: {"revision":"6","type":"changed"}\n\n'])
    expect(queries.some((sql) => sql.includes("created_at >= now() - interval '24 hours'") && sql.includes("revision > $2::bigint"))).toBe(true)
    expect(target.ended).toBe(true)
  })

  test("sends a reset marker when the replay cursor predates retained history", async () => {
    oldestRevision = "8"
    latestRevision = "9"
    replay = []
    const target = createResponse()
    const request: ApiRequest = { method: "GET", query: { id: "33333333-3333-4333-8333-333333333333" }, headers: { "Last-Event-ID": "1" } }

    setSqlFixture({ queryRows: async (sql) => {
      queries.push(sql)
      if (sql.includes("SELECT min(revision)")) return [{ oldest: oldestRevision, latest: latestRevision, latest_type: "changed" } as QueryResultRow]
      return []
    } })

    await handler(request, target.response)

    expect(target.frames[0]).toBe('id: 9\nevent: reset\ndata: {"revision":"9","type":"reset"}\n\n')
    expect(target.ended).toBe(true)
  })
})
