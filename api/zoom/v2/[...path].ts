import { proxyZoomApiRequest } from "../../../../server/zoom-api"

type ApiRequest = {
  body?: Buffer | string
  headers?: Record<string, string | undefined>
  method?: string
  query?: {
    path?: string | string[]
  }
}

type ApiResponse = {
  end: (body?: string | Uint8Array) => void
  setHeader: (name: string, value: string) => void
  statusCode: number
}

function getPath(query: ApiRequest["query"]): string {
  const segments = query?.path
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === "path" || value == null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item)
      }
      continue
    }

    searchParams.append(key, value)
  }

  const pathname = Array.isArray(segments)
    ? `/${segments.join("/")}`
    : typeof segments === "string" && segments.length > 0
      ? `/${segments}`
      : "/"

  const queryString = searchParams.toString()
  return queryString ? `${pathname}?${queryString}` : pathname
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const body = typeof request.body === "string" ? Buffer.from(request.body) : request.body
    const proxyResponse = await proxyZoomApiRequest({
      authorization: request.headers?.authorization ?? null,
      body,
      contentType: request.headers?.["content-type"] ?? null,
      method: request.method ?? "GET",
      path: getPath(request.query),
    })

    response.statusCode = proxyResponse.status

    const contentType = proxyResponse.headers.get("content-type")
    if (contentType) {
      response.setHeader("Content-Type", contentType)
    }

    response.end(Buffer.from(await proxyResponse.arrayBuffer()))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom request failed"
    response.statusCode = 500
    response.setHeader("Content-Type", "application/json")
    response.end(JSON.stringify({ error: message }))
  }
}
