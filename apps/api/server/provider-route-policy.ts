import type { WorkspacePermission } from "./workspace-access.js"

export type ProviderBodyKind = "none" | "json" | "binary"

export type ProviderRouteRule = {
  body: ProviderBodyKind
  maxBodyBytes: number
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: RegExp
  permission: WorkspacePermission
  query: readonly string[]
}

type ProviderQuery = Record<string, string | string[] | undefined>

export type AuthorizedProviderRoute = {
  body: ProviderBodyKind
  maxBodyBytes: number
  path: string
  permission: WorkspacePermission
}

export class ProviderRouteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderRouteError"
  }
}

export function authorizeProviderRoute(method: string | undefined, query: ProviderQuery | undefined, rules: readonly ProviderRouteRule[]): AuthorizedProviderRoute {
  const normalizedMethod = method?.toUpperCase()
  const rawPath = query?.path
  const segments = Array.isArray(rawPath) ? rawPath : typeof rawPath === "string" ? [rawPath] : []
  const pathname = `/${segments.join("/")}`
  const rule = rules.find((candidate) => candidate.method === normalizedMethod && candidate.path.test(pathname))

  if (!rule) throw new ProviderRouteError("Provider operation is not allowed")

  const allowedQuery = new Set(rule.query)
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === "path" || value === undefined) continue
    if (!allowedQuery.has(key) || Array.isArray(value)) {
      throw new ProviderRouteError("Provider query is not allowed")
    }
    searchParams.set(key, value)
  }

  const search = searchParams.toString()
  return {
    body: rule.body,
    maxBodyBytes: rule.maxBodyBytes,
    path: `${pathname}${search ? `?${search}` : ""}`,
    permission: rule.permission,
  }
}

export function prepareProviderBody(body: unknown, bodyKind: ProviderBodyKind, maxBodyBytes: number): Buffer | undefined {
  if (bodyKind === "none") {
    if (body !== undefined && body !== null && body !== "") throw new ProviderRouteError("This provider operation does not accept a body")
    return undefined
  }

  const prepared = Buffer.isBuffer(body)
    ? body
    : typeof body === "string"
      ? Buffer.from(body)
      : body === undefined || body === null
        ? Buffer.alloc(0)
        : Buffer.from(JSON.stringify(body))

  if (prepared.byteLength === 0) throw new ProviderRouteError("Provider request body is required")
  if (prepared.byteLength > maxBodyBytes) throw new ProviderRouteError("Provider request body is too large")
  return prepared
}
