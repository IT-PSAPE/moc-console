/** Failure codes the API's provider proxies return alongside a human message. */
export type ProviderFailureCode =
  | "invalid_request"
  | "forbidden"
  | "not_connected"
  | "reauth_required"
  | "misconfigured"
  | "upstream_failed"

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
}

const FAILURE_CODES: readonly string[] = [
  "invalid_request",
  "forbidden",
  "not_connected",
  "reauth_required",
  "misconfigured",
  "upstream_failed",
]

/** Builds a typed error from a failed proxy response, reading it only once. */
export async function providerRequestError(response: Response, fallback: string): Promise<ProviderRequestError> {
  const raw = await response.text()
  let message = raw ? `${fallback}: ${raw}` : fallback
  let code: ProviderFailureCode | null = null

  try {
    const parsed = JSON.parse(raw) as { error?: string; code?: string }
    if (parsed.error) message = parsed.error
    if (parsed.code && FAILURE_CODES.includes(parsed.code)) code = parsed.code as ProviderFailureCode
  } catch {
    // A non-JSON body (a gateway's HTML error page, say) keeps the raw text.
  }

  return new ProviderRequestError(message, code, response.status)
}
