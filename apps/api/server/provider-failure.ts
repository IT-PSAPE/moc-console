import { IntegrationNotConnectedError } from "./integration-access.js"
import { ProviderConfigError } from "./provider-config.js"
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
  | "upstream_failed"

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

  // Anything left is the provider or the network failing on us. Pass the reason
  // through rather than a fixed string: an operator reading it in the console
  // needs to tell a quota rejection from a stale scope from a Supabase error.
  const detail = error instanceof Error ? error.message : null
  return {
    status: 502,
    body: {
      error: detail ? `${providerLabel} request failed: ${detail}` : `${providerLabel} request failed`,
      code: "upstream_failed",
    },
  }
}
