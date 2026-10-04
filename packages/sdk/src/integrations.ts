import type { MocTransport, RequestOptions } from "./transport"

export type IntegrationProvider = "youtube" | "zoom"
export type ProviderRequestOptions = Pick<RequestOptions, "method" | "json" | "body" | "headers" | "signal" | "workspaceId">

function safeProviderPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Provider API path is invalid")
  }
  const pathname = path.split("?", 1)[0]
  if (pathname.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error("Provider API path is invalid")
  }
  return path
}

export function createIntegrationsClient(transport: MocTransport) {
  async function providerRequest(provider: IntegrationProvider, path: string, options: ProviderRequestOptions = {}): Promise<Response> {
    const prefix = provider === "youtube" ? "/api/youtube/v3" : "/api/zoom/v2"
    return transport.request<Response>(`${prefix}${safeProviderPath(path)}`, { ...options, responseType: "response" })
  }

  async function oauthRequest(path: string, body: Record<string, string>, fallback: string): Promise<void> {
    const response = await transport.request<Response>(path, { method: "POST", json: body, responseType: "response" })
    if (response.ok) return
    const contentType = response.headers.get("content-type") ?? ""
    let message = fallback
    if (contentType.includes("application/json")) {
      const data = await response.json() as { error?: unknown }
      if (typeof data.error === "string" && data.error) message = data.error
    } else {
      const text = await response.text()
      if (text) message = text
    }
    throw new Error(message)
  }

  return {
    providerRequest,
    youtubeRequest(path: string, options?: ProviderRequestOptions) {
      return providerRequest("youtube", path, options)
    },
    zoomRequest(path: string, options?: ProviderRequestOptions) {
      return providerRequest("zoom", path, options)
    },
    async fetchProviderRecords<T>(provider: IntegrationProvider, resource: "youtube-streams" | "zoom-meetings", id?: string, workspaceId?: string): Promise<T[]> {
      if ((provider === "zoom") !== (resource === "zoom-meetings")) throw new Error("Provider records resource does not match provider")
      const query = id ? `?id=${encodeURIComponent(id)}` : ""
      const response = await providerRequest(provider, `/moc-records${query}`, { workspaceId })
      if (!response.ok) throw new Error("Provider records could not be loaded")
      const body = await response.json() as { records?: unknown }
      if (!Array.isArray(body.records)) throw new Error("Provider records response was invalid")
      return body.records as T[]
    },
    exchangeYouTubeCode(code: string, redirectUri: string, workspaceId: string) {
      return oauthRequest("/api/youtube/oauth/exchange", { code, redirectUri, workspaceId }, "YouTube token exchange failed")
    },
    revokeYouTube(workspaceId: string) {
      return oauthRequest("/api/youtube/oauth/revoke", { workspaceId }, "YouTube token revoke failed")
    },
    exchangeZoomCode(code: string, redirectUri: string, workspaceId: string) {
      return oauthRequest("/api/zoom/oauth/exchange", { code, redirectUri, workspaceId }, "Zoom token exchange failed")
    },
    revokeZoom(workspaceId: string) {
      return oauthRequest("/api/zoom/oauth/revoke", { workspaceId }, "Zoom could not be disconnected")
    },
  }
}
