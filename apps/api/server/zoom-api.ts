import { getIntegrationAccessToken, markIntegrationReauthRequired } from "./integration-access.js"
import { fetchProvider } from "./provider-config.js"
import { ProviderUpstreamError, type ProviderUpstreamFailureKind } from "./provider-failure.js"

const ZOOM_API = "https://api.zoom.us/v2"

type ProxyZoomApiParams = {
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
  workspaceId: string
}

function isRateLimited(response: Response, body: string): boolean {
  if (response.status === 429) return true
  const normalized = body.toLowerCase()
  return normalized.includes("rate limit") || normalized.includes("ratelimit") || normalized.includes("too many requests")
}

async function classifyZoomFailure(response: Response): Promise<ProviderUpstreamError> {
  if (response.status === 401) return new ProviderUpstreamError("unauthorized")
  const body = await response.text()
  if (isRateLimited(response, body)) return new ProviderUpstreamError("rate_limited")
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

export async function proxyZoomApiRequest({ body, contentType, method, path, workspaceId }: ProxyZoomApiParams): Promise<Response> {
  const requestUrl = `${ZOOM_API}${path}`
  let accessToken = await getIntegrationAccessToken("zoom", workspaceId)
  let providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))

  if (providerResponse.status === 401) {
    accessToken = await getIntegrationAccessToken("zoom", workspaceId, { forceRefresh: true })
    providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))
    if (providerResponse.status === 401) await markIntegrationReauthRequired("zoom", workspaceId)
  }

  if (!providerResponse.ok) throw await classifyZoomFailure(providerResponse)
  return providerResponse
}
