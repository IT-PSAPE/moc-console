import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { emptyProviderSyncSummary } from "../../streams/sync-summary.js"
import handler from "./stream-sync.js"

type Recorded = { body: unknown; headers: Record<string, string>; status: number }

function createResponse(recorded: Recorded) {
  const response = {
    status: (code: number) => {
      recorded.status = code
      return response
    },
    json: (body: unknown) => {
      recorded.body = body
    },
    setHeader: (name: string, value: string) => {
      recorded.headers[name] = value
    },
  }
  return response
}

describe("stream sync cron route", () => {
  it("refuses anything but an authorized GET", async () => {
    process.env.CRON_SECRET = "cron-secret"

    const posted: Recorded = { body: null, headers: {}, status: 0 }
    await handler({ method: "POST", headers: { authorization: "Bearer cron-secret" } }, createResponse(posted))
    assert.equal(posted.status, 405)
    assert.equal(posted.headers.Allow, "GET")

    const unsigned: Recorded = { body: null, headers: {}, status: 0 }
    await handler({ method: "GET", headers: {} }, createResponse(unsigned))
    assert.equal(unsigned.status, 401)

    const wrongSecret: Recorded = { body: null, headers: {}, status: 0 }
    await handler({ method: "GET", headers: { authorization: "Bearer nope" } }, createResponse(wrongSecret))
    assert.equal(wrongSecret.status, 401)

    delete process.env.CRON_SECRET
  })

  it("answers 200 with the partial summary rather than making Vercel re-spend provider quota", async () => {
    process.env.CRON_SECRET = "cron-secret"
    const recorded: Recorded = { body: null, headers: {}, status: 0 }
    const summary = {
      failures: [{ provider: "zoom" as const, reason: "rate_limited" as const, workspaceId: "workspace-1" }],
      youtube: emptyProviderSyncSummary(),
      zoom: emptyProviderSyncSummary(),
    }

    await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, createResponse(recorded), async () => summary)

    assert.equal(recorded.status, 200)
    assert.deepEqual(recorded.body, { ok: true, ...summary })
    delete process.env.CRON_SECRET
  })

  it("answers 500 only when the sweep could not run at all", async () => {
    process.env.CRON_SECRET = "cron-secret"
    const recorded: Recorded = { body: null, headers: {}, status: 0 }

    await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, createResponse(recorded), async () => {
      throw new Error("connection list unavailable")
    })

    assert.equal(recorded.status, 500)
    assert.deepEqual(recorded.body, { error: "connection list unavailable" })
    delete process.env.CRON_SECRET
  })
})
