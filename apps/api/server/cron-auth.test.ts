import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { requireAuthorizedCronGet } from "./cron-auth.js"

type TestResponse = {
  statusCode: number | null
  body: unknown
  headers: Map<string, string>
  response: {
    status: (code: number) => TestResponse["response"]
    json: (body: unknown) => void
    setHeader: (name: string, value: string) => void
  }
}

function createResponse(): TestResponse {
  const result: TestResponse = {
    statusCode: null,
    body: null,
    headers: new Map(),
    response: {
      status(code: number) {
        result.statusCode = code
        return result.response
      },
      json(body: unknown) {
        result.body = body
      },
      setHeader(name: string, value: string) {
        result.headers.set(name, value)
      },
    },
  }
  return result
}

describe("requireAuthorizedCronGet", () => {
  it("accepts a signed GET invocation", () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = "test-secret"
    try {
      const result = createResponse()
      assert.equal(
        requireAuthorizedCronGet({ method: "GET", headers: { authorization: "Bearer test-secret" } }, result.response),
        true,
      )
      assert.equal(result.statusCode, null)
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = previousSecret
    }
  })

  it("rejects a signed non-GET invocation before checking the secret", () => {
    const result = createResponse()
    assert.equal(
      requireAuthorizedCronGet({ method: "POST", headers: { authorization: "Bearer valid" } }, result.response),
      false,
    )
    assert.equal(result.statusCode, 405)
    assert.deepEqual(result.body, { error: "Method not allowed" })
    assert.equal(result.headers.get("Allow"), "GET")
  })

  it("rejects an unsigned GET invocation", () => {
    const previousSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = "test-secret"
    try {
      const result = createResponse()
      assert.equal(requireAuthorizedCronGet({ method: "GET" }, result.response), false)
      assert.equal(result.statusCode, 401)
      assert.deepEqual(result.body, { error: "Unauthorized" })
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = previousSecret
    }
  })
})
