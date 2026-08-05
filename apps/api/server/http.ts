// The minimal request/response shapes every handler in this app is written
// against. Vercel's Node runtime passes objects compatible with these; keeping
// our own structural types (rather than importing @vercel/node) means the
// handlers stay testable as plain functions.

export type ApiRequest = {
  method?: string
  body?: unknown
  url?: string
  query?: Record<string, string | string[] | undefined>
  headers?: Record<string, string | string[] | undefined>
}

export type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
  end?: (body?: unknown) => void
}

export function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  if (!headers) return null
  const requestedName = name.toLowerCase()
  const entry = Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === requestedName)
  const raw = entry?.[1]
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

export function normaliseHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string | undefined> {
  if (!headers) return {}
  const out: Record<string, string | undefined> = {}
  for (const [name, value] of Object.entries(headers)) {
    out[name] = Array.isArray(value) ? value[0] : value
  }
  return out
}
