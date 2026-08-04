import { getIntegrationAccessToken } from "./integration-access.js"

const ZOOM_API = "https://api.zoom.us/v2"

type ProxyZoomApiParams = {
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
  workspaceId: string
}

export async function proxyZoomApiRequest({ body, contentType, method, path, workspaceId }: ProxyZoomApiParams): Promise<Response> {
  const accessToken = await getIntegrationAccessToken("zoom", workspaceId)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }

  if (contentType) {
    headers["Content-Type"] = contentType
  }

  const hasBody = body && method !== "GET" && method !== "HEAD"
  return fetch(`${ZOOM_API}${path}`, {
    method,
    headers,
    body: hasBody ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : undefined,
  })
}
