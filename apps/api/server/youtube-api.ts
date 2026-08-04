import { getIntegrationAccessToken } from "./integration-access.js"

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3"
const YOUTUBE_UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3"

type ProxyYouTubeApiParams = {
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
  workspaceId: string
}

export async function proxyYouTubeApiRequest({ body, contentType, method, path, workspaceId }: ProxyYouTubeApiParams): Promise<Response> {
  const accessToken = await getIntegrationAccessToken("youtube", workspaceId)
  const baseUrl = path.startsWith("/thumbnails/") ? YOUTUBE_UPLOAD_API : YOUTUBE_API
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
  if (contentType) headers["Content-Type"] = contentType

  const hasBody = body && method !== "GET" && method !== "HEAD"
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: hasBody ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength) : undefined,
  })
}
