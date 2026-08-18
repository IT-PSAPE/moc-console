import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { IntegrationNotConnectedError, ZoomReauthRequiredError } from "../integration-access.js"
import { IntegrationStoreError } from "../integration-oauth-store.js"
import { ProviderConfigError, ProviderRequestTimeoutError } from "../provider-config.js"
import { ProviderUpstreamError } from "../provider-failure.js"
import { classifySyncFailure } from "./sync-failure.js"

describe("classifySyncFailure", () => {
  it("treats a connection that is absent or needs reconnecting as a quiet skip", () => {
    // The proxies already stamp the public connection row, so the next sweep
    // filters the workspace out. Nothing here is worth alerting on.
    assert.deepEqual(classifySyncFailure(new IntegrationNotConnectedError("youtube")), { quiet: true, reason: "not_connected", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new ZoomReauthRequiredError()), { quiet: true, reason: "reauth_required", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new ProviderUpstreamError("unauthorized")), { quiet: true, reason: "reauth_required", terminalForProvider: false })
  })

  it("reports anything a workspace cannot resolve for itself as a failure", () => {
    assert.deepEqual(classifySyncFailure(new IntegrationStoreError()), { quiet: false, reason: "credentials_unavailable", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new ProviderRequestTimeoutError()), { quiet: false, reason: "upstream_timed_out", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new ProviderUpstreamError("forbidden")), { quiet: false, reason: "forbidden", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new ProviderUpstreamError("failed")), { quiet: false, reason: "upstream_failed", terminalForProvider: false })
    assert.deepEqual(classifySyncFailure(new Error("boom")), { quiet: false, reason: "unknown", terminalForProvider: false })
  })

  it("marks an outage the next workspace inherits as terminal for the whole provider", () => {
    // YouTube quota is one bucket for the Google project and a missing provider
    // credential is a deployment fault, so sweeping on only multiplies the
    // reported failures.
    assert.deepEqual(classifySyncFailure(new ProviderUpstreamError("rate_limited")), { quiet: false, reason: "rate_limited", terminalForProvider: true })
    assert.deepEqual(classifySyncFailure(new ProviderConfigError("YouTube", ["YOUTUBE_CLIENT_ID"])), { quiet: false, reason: "misconfigured", terminalForProvider: true })
  })
})
