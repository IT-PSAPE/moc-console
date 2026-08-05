import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { IntegrationNotConnectedError } from "./integration-access.js"
import { ProviderConfigError } from "./provider-config.js"
import { providerFailure } from "./provider-failure.js"
import { ProviderRouteError } from "./provider-route-policy.js"
import { WorkspaceAccessError } from "./workspace-access.js"
import { YouTubeReauthRequiredError } from "./youtube-oauth.js"
import { ZoomReauthRequiredError } from "./zoom-oauth.js"

describe("providerFailure", () => {
  it("separates the distinct failures a caller must act on differently", () => {
    const cases: Array<[unknown, number, string]> = [
      [new ProviderRouteError("Provider query is not allowed"), 400, "invalid_request"],
      [new WorkspaceAccessError("Insufficient workspace permission"), 403, "forbidden"],
      [new IntegrationNotConnectedError("youtube"), 409, "not_connected"],
      [new YouTubeReauthRequiredError(), 401, "reauth_required"],
      [new ZoomReauthRequiredError(), 401, "reauth_required"],
      [new ProviderConfigError("Google OAuth", ["GOOGLE_CLIENT_ID"]), 500, "misconfigured"],
      [new Error("quotaExceeded"), 502, "upstream_failed"],
    ]

    for (const [error, status, code] of cases) {
      const failure = providerFailure("YouTube", error)
      assert.equal(failure.status, status, `status for ${code}`)
      assert.equal(failure.body.code, code)
      assert.ok(failure.body.error.length > 0)
    }
  })

  it("passes the upstream reason through so an operator can tell causes apart", () => {
    assert.equal(
      providerFailure("YouTube", new Error("quotaExceeded")).body.error,
      "YouTube request failed: quotaExceeded",
    )
    assert.equal(providerFailure("Zoom", "not an error").body.error, "Zoom request failed")
  })

  it("reports a missing deployment variable by name", () => {
    const failure = providerFailure("YouTube", new ProviderConfigError("Google OAuth", ["GOOGLE_CLIENT_ID"]))
    assert.match(failure.body.error, /GOOGLE_CLIENT_ID/)
  })
})
