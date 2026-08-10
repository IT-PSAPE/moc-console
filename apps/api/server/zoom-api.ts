import { getIntegrationAccessToken, markIntegrationReauthRequiredForStoredToken } from "./integration-access.js"
import { fetchProvider, type ProviderResponse } from "./provider-config.js"
import { ProviderUpstreamError, type ProviderUpstreamFailureKind } from "./provider-failure.js"

const ZOOM_API = "https://api.zoom.us/v2"

type ProxyZoomApiParams = {
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
  workspaceId: string
}

function isRateLimited(response: ProviderResponse, body: string): boolean {
  if (response.status === 429) return true
  const normalized = body.toLowerCase()
  return normalized.includes("rate limit") || normalized.includes("ratelimit") || normalized.includes("too many requests")
}

/** Zoom's error code for a meeting that does not exist. */
const MEETING_NOT_FOUND_CODE = 3001

/**
 * True only when Zoom itself states the resource is gone. Zoom answers a deleted
 * meeting with code 3001, as a 404 and sometimes as a 400, so the code — not the
 * status — is what proves absence.
 *
 * The console deletes a local meeting on the strength of this, so a bare status
 * is deliberately not enough: a platform 404 from a bad rewrite or a missing
 * function would otherwise read as "every meeting was cancelled".
 */
export function isZoomNotFoundBody(status: number, body: string): boolean {
  if (status !== 404 && status !== 400) return false
  try {
    return (JSON.parse(body) as { code?: unknown }).code === MEETING_NOT_FOUND_CODE
  } catch {
    return false
  }
}

async function classifyZoomFailure(response: ProviderResponse): Promise<ProviderUpstreamError> {
  if (response.status === 401) return new ProviderUpstreamError("unauthorized")
  const body = await response.text()
  if (isRateLimited(response, body)) return new ProviderUpstreamError("rate_limited")
  if (isZoomNotFoundBody(response.status, body)) return new ProviderUpstreamError("not_found")
  const kind: ProviderUpstreamFailureKind = response.status === 403 ? "forbidden" : "failed"
  return new ProviderUpstreamError(kind)
}

function buildRequestInit(body: Buffer | undefined, contentType: string | null | undefined, method: string, accessToken: string): RequestInit {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  if (contentType) headers["Content-Type"] = contentType
  const hasBody = body && method !== "GET" && method !== "HEAD"
  return {
    method,
    headers,
    body: hasBody ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : undefined,
  }
}

function removeHostStartUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeHostStartUrls)
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) =>
      key === "start_url" ? [] : [[key, removeHostStartUrls(nestedValue)]],
    ),
  )
}

/**
 * Zoom returns a host-only `start_url` from meeting create, update, and list
 * endpoints. The proxy is the browser boundary, so remove it recursively from
 * every successful JSON response before the Console can receive it.
 */
export function sanitizeZoomProxyResponseBody(body: Uint8Array): Buffer {
  if (body.byteLength === 0) return Buffer.from(body)

  try {
    return Buffer.from(JSON.stringify(removeHostStartUrls(JSON.parse(Buffer.from(body).toString("utf8")))))
  } catch {
    throw new ProviderUpstreamError("failed")
  }
}

export async function proxyZoomApiRequest({ body, contentType, method, path, workspaceId }: ProxyZoomApiParams): Promise<ProviderResponse> {
  const requestUrl = `${ZOOM_API}${path}`
  let accessToken = await getIntegrationAccessToken("zoom", workspaceId)
  let providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))

  if (providerResponse.status === 401) {
    accessToken = await getIntegrationAccessToken("zoom", workspaceId, { forceRefresh: true })
    providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))
    if (providerResponse.status === 401) await markIntegrationReauthRequiredForStoredToken("zoom", workspaceId, accessToken)
  }

  if (!providerResponse.ok) throw await classifyZoomFailure(providerResponse)
  return providerResponse
}
