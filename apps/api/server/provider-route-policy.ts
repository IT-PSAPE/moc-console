import type { WorkspacePermission } from "./workspace-access.js"

export type ProviderBodyKind = "none" | "json" | "binary" | "image"

export type ProviderRouteRule = {
  body: ProviderBodyKind
  maxBodyBytes: number
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: RegExp
  permission: WorkspacePermission
  query: readonly string[]
}

export type AuthorizedProviderRoute = {
  body: ProviderBodyKind
  maxBodyBytes: number
  path: string
  permission: WorkspacePermission
}

export class ProviderRouteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderRouteError"
  }
}

type ProviderRequestDetails = {
  pathname: string
  searchParams: URLSearchParams
}

/**
 * Single-segment URL the deployment's rewrites aim nested provider paths at,
 * because a `[...path]` function here only receives one path segment. See the
 * rewrite note in vercel.json.
 */
export const PROVIDER_PROXY_SEGMENT = "/_proxy"

/**
 * Parameter the *caller* puts the provider path in when it collapses a nested
 * path itself.
 */
export const PROVIDER_PATH_PARAM = "providerPath"

/**
 * Parameter the *deployment's* rewrites use for the same job. Deliberately a
 * different name: a rewrite still matches a URL the caller already collapsed,
 * and a shared name would leave two values on one parameter — the rewrite's
 * being the useless `_proxy` — with only luck deciding which one was read.
 */
export const REWRITTEN_PATH_PARAM = "rewrittenPath"

/** Matches a routing placeholder (`/[...path]`) left in a rewritten pathname. */
const PLACEHOLDER_SEGMENT = /^\/\[.+\]$/

/**
 * First usable provider path across both parameters, preferring the caller's.
 * Values naming the proxy segment itself are what a rewrite produces when it
 * re-matches an already-collapsed URL, and are ignored.
 */
function providerPathParam(searchParams: URLSearchParams): string | null {
  const sentinel = PROVIDER_PROXY_SEGMENT.slice(1)
  for (const name of [PROVIDER_PATH_PARAM, REWRITTEN_PATH_PARAM]) {
    for (const raw of searchParams.getAll(name)) {
      // A path that travelled through a rewrite can arrive still encoded.
      const value = (raw.includes("%") ? safeDecode(raw) : raw).trim()
      if (value && value !== sentinel) return value
    }
  }
  return null
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function providerRequestDetails(requestUrl: string | undefined, routePrefix: string): ProviderRequestDetails {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(requestUrl ?? "/", "https://moc.invalid")
  } catch {
    throw new ProviderRouteError("Provider operation is not allowed")
  }

  const normalizedPrefix = `/${routePrefix.split("/").filter(Boolean).join("/")}`
  if (!parsedUrl.pathname.startsWith(`${normalizedPrefix}/`)) {
    throw new ProviderRouteError("Provider operation is not allowed")
  }

  const remainder = parsedUrl.pathname.slice(normalizedPrefix.length)

  // A rewritten request has no provider path left in the URL — the pathname is
  // the rewrite target — so the parameter is the only source. It stays subject
  // to the same method, path and permission rules below, which is what makes
  // trusting it safe: it can only reach an operation the caller could already
  // have called directly.
  if (remainder === PROVIDER_PROXY_SEGMENT || PLACEHOLDER_SEGMENT.test(remainder)) {
    const provided = providerPathParam(parsedUrl.searchParams)
    if (!provided) throw new ProviderRouteError("Provider operation is not allowed")
    return {
      pathname: provided.startsWith("/") ? provided : `/${provided}`,
      searchParams: parsedUrl.searchParams,
    }
  }

  return {
    pathname: remainder,
    searchParams: parsedUrl.searchParams,
  }
}

export function authorizeProviderRoute(method: string | undefined, requestUrl: string | undefined, routePrefix: string, rules: readonly ProviderRouteRule[]): AuthorizedProviderRoute {
  const normalizedMethod = method?.toUpperCase()
  const { pathname, searchParams: requestSearchParams } = providerRequestDetails(requestUrl, routePrefix)
  const rule = rules.find((candidate) => candidate.method === normalizedMethod && candidate.path.test(pathname))

  if (!rule) throw new ProviderRouteError("Provider operation is not allowed")

  const allowedQuery = new Set(rule.query)
  const searchParams = new URLSearchParams()
  const seenQuery = new Set<string>()
  for (const [key, value] of requestSearchParams) {
    // The runtime adds its own routing metadata to the request URL (Vercel
    // appends the `[...path]` catch-all value, for example). The allow-list is
    // what reaches the provider, so anything outside it is dropped rather than
    // rejected: unknown keys never leave this function, and rejecting them only
    // makes the proxy break whenever the platform adds a new parameter.
    if (!allowedQuery.has(key)) continue
    if (seenQuery.has(key)) throw new ProviderRouteError("Provider query is not allowed")
    seenQuery.add(key)
    searchParams.set(key, value)
  }

  const search = searchParams.toString()
  return {
    body: rule.body,
    maxBodyBytes: rule.maxBodyBytes,
    path: `${pathname}${search ? `?${search}` : ""}`,
    permission: rule.permission,
  }
}

function isEmptyProviderBody(body: unknown): boolean {
  if (body === undefined || body === null || body === "") return true
  if (Buffer.isBuffer(body)) return body.byteLength === 0
  // A request that declares `Content-Type: application/json` but carries no
  // payload is parsed by the runtime into an empty object, so bodyless methods
  // arrive here as `{}` rather than as nothing at all.
  if (typeof body === "object") return Object.keys(body).length === 0
  return false
}

export type PreparedProviderBody = {
  body: Buffer | undefined
  /**
   * Content type to send upstream when the route decides it rather than the
   * caller — an image arriving inside a JSON envelope, for instance, must not
   * reach the provider labelled `application/json`.
   */
  contentType: string | null
}

/** What YouTube documents thumbnails.set as accepting. */
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "application/octet-stream"])

function withinLimit(body: Buffer, maxBodyBytes: number): Buffer {
  if (body.byteLength === 0) throw new ProviderRouteError("Provider request body is required")
  if (body.byteLength > maxBodyBytes) throw new ProviderRouteError("Provider request body is too large")
  return body
}

/**
 * Reads an image out of a `{ image, contentType }` JSON envelope.
 *
 * The bytes travel base64-encoded because the runtime's handling of a raw
 * binary request body is not something this app can rely on — a body it decides
 * to treat as text comes back re-encoded, and the provider then rejects the
 * image as corrupt. A JSON body is parsed predictably, so the encoded form is
 * the one path known to deliver the bytes intact. Raw bytes are still accepted
 * when the runtime does hand them over.
 */
function prepareImageBody(body: unknown, maxBodyBytes: number): PreparedProviderBody {
  if (Buffer.isBuffer(body)) {
    return { body: withinLimit(body, maxBodyBytes), contentType: null }
  }

  let envelope: unknown = body
  if (typeof body === "string") {
    try {
      envelope = JSON.parse(body)
    } catch {
      throw new ProviderRouteError("Thumbnail image could not be read")
    }
  }

  if (!envelope || typeof envelope !== "object") throw new ProviderRouteError("Thumbnail image is required")
  const { image, contentType } = envelope as { image?: unknown; contentType?: unknown }
  if (typeof image !== "string" || !image) throw new ProviderRouteError("Thumbnail image is required")

  const type = typeof contentType === "string" && contentType ? contentType : "image/jpeg"
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    throw new ProviderRouteError(`Thumbnail must be a JPEG or PNG image (received ${type})`)
  }

  return { body: withinLimit(Buffer.from(image, "base64"), maxBodyBytes), contentType: type }
}

export function prepareProviderBody(body: unknown, bodyKind: ProviderBodyKind, maxBodyBytes: number): PreparedProviderBody {
  if (bodyKind === "none") {
    if (!isEmptyProviderBody(body)) throw new ProviderRouteError("This provider operation does not accept a body")
    return { body: undefined, contentType: null }
  }

  if (bodyKind === "image") return prepareImageBody(body, maxBodyBytes)

  const prepared = Buffer.isBuffer(body)
    ? body
    : typeof body === "string"
      ? Buffer.from(body)
      : body === undefined || body === null
        ? Buffer.alloc(0)
        : Buffer.from(JSON.stringify(body))

  return { body: withinLimit(prepared, maxBodyBytes), contentType: null }
}
