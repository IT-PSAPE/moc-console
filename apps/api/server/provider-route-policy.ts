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

type ProviderRequestDetails = {
  pathname: string
  searchParams: URLSearchParams
}

function providerRequestDetails(requestUrl: string | undefined, routePrefix: string): ProviderRequestDetails {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(requestUrl ?? "/", "https://moc.invalid")
  } catch {
    throw new ProviderRouteError("Provider operation is not allowed")
  }

  const normalizedPrefix = `/${routePrefix.split("/").filter(Boolean).join("/")}`
  if (!parsedUrl.pathname.startsWith(`${normalizedPrefix}/`)) {
    throw new ProviderRouteError("Provider operation is not allowed")
  }

  return {
    pathname: parsedUrl.pathname.slice(normalizedPrefix.length),
    searchParams: parsedUrl.searchParams,
  }
}

export function authorizeProviderRoute(method: string | undefined, requestUrl: string | undefined, routePrefix: string, rules: readonly ProviderRouteRule[]): AuthorizedProviderRoute {
  const normalizedMethod = method?.toUpperCase()
  const { pathname, searchParams: requestSearchParams } = providerRequestDetails(requestUrl, routePrefix)
  const rule = rules.find((candidate) => candidate.method === normalizedMethod && candidate.path.test(pathname))

  if (!rule) throw new ProviderRouteError("Provider operation is not allowed")

  const allowedQuery = new Set(rule.query)
  const searchParams = new URLSearchParams()
  const seenQuery = new Set<string>()
  for (const [key, value] of requestSearchParams) {
    if (!allowedQuery.has(key) || seenQuery.has(key)) {
      throw new ProviderRouteError("Provider query is not allowed")
    }
    seenQuery.add(key)
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
