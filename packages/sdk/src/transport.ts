import { MocApiError } from "./error"

export type RequestOptions = {
  method?: string
  json?: unknown
  body?: BodyInit | null
  headers?: HeadersInit
  signal?: AbortSignal
  workspaceId?: string
  responseType?: "json" | "arrayBuffer" | "response"
}

export type MocTransport = {
  request<T>(path: string, options?: RequestOptions): Promise<T>
  call<T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T>
  url(path: string): string
}

export type WorkspaceResolver = () => string | null | Promise<string | null>

export type MocTransportOptions = {
  getWorkspaceId?: WorkspaceResolver
  fetchImpl?: typeof fetch
}

type ErrorEnvelope = {
  error?: { code?: unknown; message?: unknown; details?: unknown }
  code?: unknown
  message?: unknown
  details?: unknown
  requestId?: unknown
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}

function readErrorResponse(response: Response, text: string): MocApiError {
  let payload: ErrorEnvelope | null = null
  try {
    payload = text ? JSON.parse(text) as ErrorEnvelope : null
  } catch {
    payload = null
  }

  const errorCode = payload?.error?.code ?? payload?.code
  const errorMessage = payload?.error?.message ?? payload?.message
  const details = payload?.error?.details ?? payload?.details
  const code = typeof errorCode === "string"
    ? errorCode
    : response.status >= 500 ? "unavailable" : "api_error"
  const message = typeof errorMessage === "string"
    ? errorMessage
    : `Request failed with status ${response.status}`
  const requestId = typeof payload?.requestId === "string"
    ? payload.requestId
    : response.headers.get("X-Request-Id")

  return new MocApiError(message, { status: response.status, code, requestId, details })
}

export function createMocTransport(apiBaseUrl: string, transportOptions: MocTransportOptions = {}): MocTransport {
  const fetchImpl = transportOptions.fetchImpl ?? fetch
  function url(path: string): string {
    const base = apiBaseUrl.trim().replace(/\/+$/, "")
    return `${base}${normalizePath(path)}`
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers)
    let body = options.body
    if (options.json !== undefined) {
      headers.set("Content-Type", "application/json")
      body = JSON.stringify(options.json)
    }

    const resolvedWorkspaceId = options.workspaceId ?? await transportOptions.getWorkspaceId?.() ?? null
    if (resolvedWorkspaceId) headers.set("X-MOC-Workspace", resolvedWorkspaceId)

    const response = await fetchImpl(url(path), {
      method: options.method ?? (body === undefined ? "GET" : "POST"),
      credentials: "include",
      headers,
      body,
      signal: options.signal,
    })
    if (options.responseType === "response") return response as T
    if (!response.ok) throw readErrorResponse(response, await response.text())
    if (options.responseType === "arrayBuffer") return await response.arrayBuffer() as T

    const text = await response.text()
    if (!text) return null as T

    try {
      return JSON.parse(text) as T
    } catch {
      throw new MocApiError("The API returned an invalid response", {
        status: response.status,
        code: "invalid_response",
        requestId: response.headers.get("X-Request-Id"),
      })
    }
  }

  async function call<T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> {
    return request<T>(`/api/platform/${encodeURIComponent(capability)}`, {
      method: "POST",
      json: { operation, input: input ?? null },
      workspaceId,
    })
  }

  return { request, call, url }
}
