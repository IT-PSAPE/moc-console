const ZOOM_API = "https://api.zoom.us/v2"

type ProxyZoomApiParams = {
  authorization: string | null
  body?: Buffer
  contentType?: string | null
  method: string
  path: string
}

export async function proxyZoomApiRequest({ authorization, body, contentType, method, path }: ProxyZoomApiParams): Promise<Response> {
  if (!authorization) {
    throw new Error("Missing Zoom authorization header")
  }

  const headers: Record<string, string> = {
    Authorization: authorization,
  }

  if (contentType) {
    headers["Content-Type"] = contentType
  }

  return fetch(`${ZOOM_API}${path}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  })
}
