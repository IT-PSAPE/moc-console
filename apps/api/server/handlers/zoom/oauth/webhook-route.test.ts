import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createZoomOAuthHandler } from "../../../../api/zoom/oauth/[action].js"
import { handleZoomWebhook } from "./webhook.js"
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
      await createZoomOAuthHandler()({
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
    await createZoomOAuthHandler()({
      method: "POST",
      body: { event: "app_deauthorized", payload: { user_id: "zoom-user" } },
      query: { action: "webhook" },
    }, response)
    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, { error: "Unauthorized" })
  })

  it("invokes the cleanup RPC only after verifying app_deauthorized", async () => {
    const secret = "zoom-test-secret"
    const body = { event: "app_deauthorized", payload: { user_id: "zoom-user" } }
    const timestamp = String(Math.floor(Date.now() / 1000))
    const response = createResponse()
    const deletedUsers: string[] = []
    const previous = process.env.ZOOM_SECRET_TOKEN
    process.env.ZOOM_SECRET_TOKEN = secret

    try {
      await handleZoomWebhook({
        method: "POST",
        body,
        headers: {
          "x-zm-request-timestamp": timestamp,
          "x-zm-signature": zoomWebhookSignature(secret, timestamp, body),
        },
      }, response, {
        async deleteIntegrationsForUser(zoomUserId) {
          deletedUsers.push(zoomUserId)
        },
      })
    } finally {
      if (previous === undefined) delete process.env.ZOOM_SECRET_TOKEN
      else process.env.ZOOM_SECRET_TOKEN = previous
    }

    assert.deepEqual(deletedUsers, ["zoom-user"])
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { ok: true })
  })

  it("records cleanup failures as failed while returning a safe response", async () => {
    const response = createResponse()
    const completionLogs: string[] = []
    const originalInfo = console.info
    const originalError = console.error
    console.info = (...values: unknown[]) => completionLogs.push(values.map(String).join(" "))
    console.error = () => undefined

    try {
      await createZoomOAuthHandler(async () => {
        throw new Error("cleanup unavailable")
      })({ method: "POST", query: { action: "webhook" } }, response)
    } finally {
      console.info = originalInfo
      console.error = originalError
    }

    const completion = completionLogs
      .map((entry) => JSON.parse(entry) as { event?: string; failed?: boolean; route?: string })
      .find((entry) => entry.event === "api.request.completed")
    assert.equal(completion?.event, "api.request.completed")
    assert.equal(completion?.failed, true)
    assert.equal(completion?.route, "zoom.webhook")
    assert.equal(response.statusCode, 500)
    assert.deepEqual(response.body, { error: "Zoom webhook processing failed" })
  })
})
