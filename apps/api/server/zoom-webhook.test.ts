import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { ApiRequest } from "./http.js"
import {
  verifyZoomWebhook,
  zoomDeauthorizedUserId,
  zoomValidationEncryptedToken,
  zoomValidationPlainToken,
  zoomWebhookSignature,
} from "./zoom-webhook.js"

const SECRET = "zoom-test-secret"

function signedRequest(body: unknown, timestamp = String(Math.floor(Date.now() / 1000))): ApiRequest {
  return {
    body,
    headers: {
      "x-zm-request-timestamp": timestamp,
      "x-zm-signature": zoomWebhookSignature(SECRET, timestamp, body),
    },
  }
}

describe("Zoom webhooks", () => {
  it("accepts only a current, correctly signed request", () => {
    const body = { event: "app_deauthorized", payload: { user_id: "zoom-user" } }
    assert.equal(verifyZoomWebhook(signedRequest(body), SECRET), true)
    const altered = signedRequest(body)
    altered.body = { ...body, event: "changed" }
    assert.equal(verifyZoomWebhook(altered, SECRET), false)
    assert.equal(verifyZoomWebhook(signedRequest(body, "1"), SECRET), false)
  })

  it("recognizes bounded Marketplace validation and deauthorization payloads", () => {
    assert.equal(
      zoomValidationPlainToken({ event: "endpoint.url_validation", payload: { plainToken: "challenge" } }),
      "challenge",
    )
    assert.equal(
      zoomDeauthorizedUserId({ event: "app_deauthorized", payload: { user_id: "zoom-user" } }),
      "zoom-user",
    )
    assert.equal(zoomDeauthorizedUserId({ event: "meeting.started", payload: { user_id: "zoom-user" } }), null)
    assert.equal(zoomValidationEncryptedToken(SECRET, "challenge"), "2fdb71806d43572c0b82d0e856c09c98a17e3f189f8e3da41217b87e22172b4c")
  })
})
