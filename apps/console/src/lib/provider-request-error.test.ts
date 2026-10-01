import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { checkProviderApiResponse, isProviderRequestError, providerRequestError } from "./provider-request-error"

describe("provider response failures", () => {
  it("identifies an HTML app fallback as API misconfiguration even with a successful status", async () => {
    const response = new Response("<!doctype html><html><body>Console</body></html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    })

    const error = await providerRequestError(response, "Unable to load streams")

    assert.equal(error.needsConfiguration, true)
    assert.equal(error.status, 200)
    assert.doesNotMatch(error.message, /doctype|<html>/)
  })

  it("preserves a structured provider connection failure", async () => {
    const response = Response.json({ code: "reauth_required", error: "Reconnect YouTube" }, { status: 401 })
    const error = await providerRequestError(response, "Unable to load streams")

    assert.equal(error.needsConnection, true)
    assert.equal(error.message, "Reconnect YouTube")
  })

  it("does not mistake an HTML gateway outage for a successful app fallback", async () => {
    const response = new Response("<html>Bad gateway</html>", {
      headers: { "Content-Type": "text/html" },
      status: 502,
    })
    const error = await providerRequestError(response, "Unable to reach the stream service")

    assert.equal(error.needsConfiguration, false)
    assert.equal(error.message, "Unable to reach the stream service")
    assert.equal(error.status, 502)
  })

  it("stops successful HTML responses before stream clients parse them as JSON", () => {
    const response = new Response("<!doctype html><html></html>", {
      headers: { "Content-Type": "text/html" },
    })

    assert.throws(function checkResponse() {
      checkProviderApiResponse(response)
    }, function isConfigurationError(error: unknown): boolean {
      return isProviderRequestError(error) && error.needsConfiguration
    })
    assert.equal(response.bodyUsed, false)
  })

  it("leaves JSON success and structured failure bodies available to callers", async () => {
    for (const status of [200, 401, 503]) {
      const response = Response.json({ status }, { status })
      const checked = checkProviderApiResponse(response)

      assert.equal(checked.status, status)
      assert.deepEqual(await checked.json(), { status })
    }
  })

  it("allows empty responses used by provider delete operations", () => {
    const response = new Response(null, { status: 204 })
    assert.equal(checkProviderApiResponse(response).status, 204)
  })
})
