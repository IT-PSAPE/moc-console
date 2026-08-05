import assert from "node:assert/strict"
import { describe, it } from "node:test"

import handler from "../../../../api/zoom/oauth/[action].js"
import { zoomValidationEncryptedToken, zoomWebhookSignature } from "../../../zoom-webhook.js"

type CapturedResponse = {
  body: unknown
  headers: Record<string, string>
  statusCode: number
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  status: (statusCode: number) => CapturedResponse
}

function createResponse(): CapturedResponse {
  const response: CapturedResponse = {
    body: null,
    headers: {},
    statusCode: 200,
    json(body) {
      response.body = body
    },
    setHeader(name, value) {
      response.headers[name] = value
    },
    status(statusCode) {
      response.statusCode = statusCode
      return response
    },
  }
  return response
}

describe("Zoom OAuth webhook endpoint", () => {
  it("returns the Marketplace URL validation response only for a verified request", async () => {
    const secret = "zoom-test-secret"
    const body = { event: "endpoint.url_validation", payload: { plainToken: "challenge" } }
    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = createResponse()
    const previous = process.env.ZOOM_SECRET_TOKEN
    process.env.ZOOM_SECRET_TOKEN = secret

    try {
      await handler({
        method: "POST",
        body,
        headers: {
          "x-zm-request-timestamp": timestamp,
          "x-zm-signature": zoomWebhookSignature(secret, timestamp, body),
        },
        query: { action: "webhook" },
      }, response)
    } finally {
      if (previous === undefined) delete process.env.ZOOM_SECRET_TOKEN
      else process.env.ZOOM_SECRET_TOKEN = previous
    }

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, {
      plainToken: "challenge",
      encryptedToken: zoomValidationEncryptedToken(secret, "challenge"),
    })
  })

  it("rejects unsigned requests without processing their payload", async () => {
    const response = createResponse()
    await handler({
      method: "POST",
      body: { event: "app_deauthorized", payload: { user_id: "zoom-user" } },
      query: { action: "webhook" },
    }, response)
    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, { error: "Unauthorized" })
  })
})
