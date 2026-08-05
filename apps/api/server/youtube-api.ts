import { getIntegrationAccessToken, markIntegrationReauthRequired } from "./integration-access.js"
import { fetchProvider, type ProviderResponse } from "./provider-config.js"
import { ProviderUpstreamError, type ProviderUpstreamFailureKind } from "./provider-failure.js"

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3"
const YOUTUBE_UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3"

type ProxyYouTubeApiParams = {
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
  workspaceId: string
}

function isQuotaFailure(body: string): boolean {
  const normalized = body.toLowerCase()
  return normalized.includes("quota") || normalized.includes("rate limit") || normalized.includes("ratelimit")
}

async function classifyYouTubeFailure(response: ProviderResponse): Promise<ProviderUpstreamError> {
  if (response.status === 401) return new ProviderUpstreamError("unauthorized")
  if (response.status === 429) return new ProviderUpstreamError("rate_limited")
  if (response.status === 403) {
    const body = await response.text()
    const kind: ProviderUpstreamFailureKind = isQuotaFailure(body) ? "rate_limited" : "forbidden"
    return new ProviderUpstreamError(kind)
  }
  return new ProviderUpstreamError("failed")
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

export async function proxyYouTubeApiRequest({ body, contentType, method, path, workspaceId }: ProxyYouTubeApiParams): Promise<ProviderResponse> {
  const baseUrl = path.startsWith("/thumbnails/") ? YOUTUBE_UPLOAD_API : YOUTUBE_API
  const requestUrl = `${baseUrl}${path}`
  let accessToken = await getIntegrationAccessToken("youtube", workspaceId)
  let providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))

  // An access token can be revoked before its advertised expiry. Refresh once
  // and retry the exact request; a second 401 means the connection must be
  // re-authorised rather than repeatedly retried.
  if (providerResponse.status === 401) {
    accessToken = await getIntegrationAccessToken("youtube", workspaceId, { forceRefresh: true })
    providerResponse = await fetchProvider(requestUrl, buildRequestInit(body, contentType, method, accessToken))
    if (providerResponse.status === 401) await markIntegrationReauthRequired("youtube", workspaceId)
  }

  if (!providerResponse.ok) throw await classifyYouTubeFailure(providerResponse)
  return providerResponse
}
