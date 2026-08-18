import { IntegrationNotConnectedError, YouTubeReauthRequiredError, ZoomReauthRequiredError } from "../integration-access.js"
import { IntegrationStoreError } from "../integration-oauth-store.js"
import { ProviderConfigError, ProviderRequestTimeoutError } from "../provider-config.js"
import { ProviderUpstreamError } from "../provider-failure.js"

export type SyncSkipReason = "not_connected" | "reauth_required" | "credentials_missing"

export type SyncFailureReason =
  | SyncSkipReason
  | "misconfigured"
  | "rate_limited"
  | "forbidden"
  | "credentials_unavailable"
  | "upstream_timed_out"
  | "upstream_failed"
  | "unknown"

export type SyncOutcome = {
  /** True when nothing is wrong with the deployment: the workspace is simply not usable right now. */
  quiet: boolean
  reason: SyncFailureReason
  /**
   * True when the outcome is not about this workspace at all — an exhausted
   * project-wide quota or a missing provider credential — so the workspaces
   * behind it cannot fare better and must not each spend a doomed request and
   * report the same outage under their own id.
   */
  terminalForProvider: boolean
}

function workspaceOutcome(quiet: boolean, reason: SyncFailureReason): SyncOutcome {
  return { quiet, reason, terminalForProvider: false }
}

/**
 * A workspace that never connected the provider, disconnected it mid-sweep, or
 * needs to reconnect is a quiet skip, not a failure. The proxies already stamp
 * `reauth_required` on the public connection row when a refresh is rejected, so
 * tomorrow's sweep filters the workspace out before spending a request — there
 * is nothing here to alert on, and logging it as an error would make a normal
 * expired connection look like a broken cron.
 */
export function classifySyncFailure(error: unknown): SyncOutcome {
  if (error instanceof IntegrationNotConnectedError) return workspaceOutcome(true, "not_connected")
  if (error instanceof YouTubeReauthRequiredError || error instanceof ZoomReauthRequiredError) {
    return workspaceOutcome(true, "reauth_required")
  }
  // A missing or invalid provider credential is a deployment fault: every
  // workspace on this provider is in the same position.
  if (error instanceof ProviderConfigError) return { quiet: false, reason: "misconfigured", terminalForProvider: true }
  if (error instanceof IntegrationStoreError) return workspaceOutcome(false, "credentials_unavailable")
  if (error instanceof ProviderRequestTimeoutError) return workspaceOutcome(false, "upstream_timed_out")
  if (error instanceof ProviderUpstreamError) {
    if (error.kind === "unauthorized") return workspaceOutcome(true, "reauth_required")
    // YouTube's quota is one bucket for the whole Google project, and Zoom
    // throttles the app as well as the account, so the next workspace inherits
    // the exhaustion rather than escaping it.
    if (error.kind === "rate_limited") return { quiet: false, reason: "rate_limited", terminalForProvider: true }
    if (error.kind === "forbidden") return workspaceOutcome(false, "forbidden")
    return workspaceOutcome(false, "upstream_failed")
  }
  return workspaceOutcome(false, "unknown")
}
