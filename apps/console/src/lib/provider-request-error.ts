/** Failure codes the API's provider proxies return alongside a human message. */
export const providerFailureCodes = [
  "invalid_request",
  "forbidden",
  "not_connected",
  "reauth_required",
  "misconfigured",
  "provider_forbidden",
  "provider_not_found",
  "rate_limited",
  "service_unavailable",
  "upstream_timed_out",
  "upstream_failed",
] as const

export type ProviderFailureCode = (typeof providerFailureCodes)[number]

/**
 * A failed provider proxy call, carrying the API's failure code so callers can
 * tell "this workspace never connected YouTube" and "the connection expired"
 * from "Google is having a bad day" — the first two are fixed by the user in
 * Streams settings, the third only by waiting.
 */
export class ProviderRequestError extends Error {
  readonly code: ProviderFailureCode | null
  readonly status: number

  constructor(message: string, code: ProviderFailureCode | null, status: number) {
    super(message)
    this.name = "ProviderRequestError"
    this.code = code
    this.status = status
  }

  /** True when the user has to (re)connect the provider before this can work. */
  get needsConnection(): boolean {
    return this.code === "not_connected" || this.code === "reauth_required"
  }

  /** True when retrying without a deployment change cannot help the user. */
  get needsConfiguration(): boolean {
    return this.code === "misconfigured"
  }

  /**
   * True when the provider states the item is gone. A settled answer, not a
   * failure to retry: reconciliation deletes the local row on the strength of it.
   */
  get isMissingUpstream(): boolean {
    return this.code === "provider_not_found"
  }

  /** True when retrying later is more useful than reconnecting. */
  get isTransient(): boolean {
    return this.code === "rate_limited"
      || this.code === "service_unavailable"
      || this.code === "upstream_timed_out"
      || this.code === "upstream_failed"
  }
}

type ProviderFailureResponse = {
  code?: unknown
  error?: unknown
}

/** Returns true only for an API code that the Console deliberately supports. */
export function isProviderFailureCode(value: unknown): value is ProviderFailureCode {
  return typeof value === "string" && providerFailureCodes.includes(value as ProviderFailureCode)
}

/** Narrows an unknown thrown value without exposing arbitrary response bodies. */
export function isProviderRequestError(error: unknown): error is ProviderRequestError {
  return error instanceof ProviderRequestError
}

/** Concise UI title for a stable provider failure, without echoing raw bodies. */
export function providerFailureTitle(provider: string, failure: ProviderRequestError | null, fallback: string): string {
  if (!failure) return fallback
  if (failure.needsConnection) return `${provider} needs reconnecting`
  if (failure.needsConfiguration) return `${provider} is not configured`
  if (failure.isTransient) return `${provider} is temporarily unavailable`
  if (failure.code === "forbidden" || failure.code === "provider_forbidden") return `${provider} rejected this request`
  return fallback
}

/** Builds a typed error from a failed proxy response, reading it only once. */
export async function providerRequestError(response: Response, fallback: string): Promise<ProviderRequestError> {
  const raw = await response.text()
  let message = fallback
  let code: ProviderFailureCode | null = null

  try {
    const parsed = JSON.parse(raw) as ProviderFailureResponse
    if (isProviderFailureCode(parsed.code)) {
      code = parsed.code
      if (typeof parsed.error === "string" && parsed.error.trim()) message = parsed.error
    }
  } catch {
    // Keep stable caller copy for non-JSON gateway and provider error bodies.
  }

  return new ProviderRequestError(message, code, response.status)
}
