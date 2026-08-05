import { IntegrationNotConnectedError } from "./integration-access.js"
import { IntegrationStoreError } from "./integration-oauth-store.js"
import { ProviderConfigError, ProviderRequestTimeoutError } from "./provider-config.js"
import { ProviderRouteError } from "./provider-route-policy.js"
import { WorkspaceAccessError } from "./workspace-access.js"
import { YouTubeReauthRequiredError } from "./youtube-oauth.js"
import { ZoomReauthRequiredError } from "./zoom-oauth.js"

export type ProviderFailure = {
  status: number
  body: {
    error: string
    code: ProviderFailureCode
  }
}

export type ProviderFailureCode =
  | "invalid_request"
  | "forbidden"
  | "not_connected"
  | "reauth_required"
  | "misconfigured"
  | "provider_forbidden"
  | "rate_limited"
  | "service_unavailable"
  | "upstream_timed_out"
  | "upstream_failed"

export type ProviderUpstreamFailureKind = "unauthorized" | "forbidden" | "rate_limited" | "failed"

/** A sanitised third-party failure that is safe to map onto the public API. */
export class ProviderUpstreamError extends Error {
  readonly kind: ProviderUpstreamFailureKind

  constructor(kind: ProviderUpstreamFailureKind) {
    super("Provider request failed")
    this.name = "ProviderUpstreamError"
    this.kind = kind
  }
}

/**
 * Maps a thrown proxy error onto the response the console can act on.
 *
 * Every one of these used to collapse into a bare 502, which made a missing
 * deployment variable, a workspace that never connected the provider, and a
 * dead refresh token indistinguishable from a transient Google outage — so the
 * console could only ever say "something failed". The `code` is the contract the
 * client branches on; the message is safe to show to a signed-in workspace
 * member and carries no secret, token or credential.
 */
export function providerFailure(providerLabel: string, error: unknown): ProviderFailure {
  if (error instanceof ProviderRouteError) {
    return { status: 400, body: { error: error.message, code: "invalid_request" } }
  }

  if (error instanceof WorkspaceAccessError) {
    return { status: 403, body: { error: error.message, code: "forbidden" } }
  }

  if (error instanceof IntegrationNotConnectedError) {
    return { status: 409, body: { error: error.message, code: "not_connected" } }
  }

  if (error instanceof YouTubeReauthRequiredError || error instanceof ZoomReauthRequiredError) {
    return { status: 401, body: { error: error.message, code: "reauth_required" } }
  }

  if (error instanceof ProviderConfigError) {
    return { status: 500, body: { error: error.message, code: "misconfigured" } }
  }

  if (error instanceof IntegrationStoreError) {
    return { status: 503, body: { error: "Integration credentials are temporarily unavailable", code: "service_unavailable" } }
  }

  if (error instanceof ProviderRequestTimeoutError) {
    return { status: 504, body: { error: `${providerLabel} did not respond in time`, code: "upstream_timed_out" } }
  }

  if (error instanceof ProviderUpstreamError) {
    if (error.kind === "unauthorized") {
      return { status: 401, body: { error: `${providerLabel} authorization was rejected; reconnect required`, code: "reauth_required" } }
    }
    if (error.kind === "forbidden") {
      return { status: 403, body: { error: `${providerLabel} rejected this request`, code: "provider_forbidden" } }
    }
    if (error.kind === "rate_limited") {
      return { status: 429, body: { error: `${providerLabel} is temporarily rate limited`, code: "rate_limited" } }
    }
    return { status: 502, body: { error: `${providerLabel} is temporarily unavailable`, code: "upstream_failed" } }
  }

  return {
    status: 502,
    body: {
      error: `${providerLabel} request failed`,
      code: "upstream_failed",
    },
  }
}
