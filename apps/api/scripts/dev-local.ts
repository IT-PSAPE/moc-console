import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { createServer as createViteServer } from "vite"
import type { ApiRequest, ApiResponse } from "../server/http.js"

type RouteParameter = { name: string; catchAll: boolean }
type RouteDefinition = { file: string; pattern: RegExp; parameters: RouteParameter[]; specificity: number }
type RouteModule = {
  default: (request: ApiRequest, response: LocalApiResponse) => Promise<void> | void
  config?: { api?: { bodyParser?: boolean } }
}
type LocalApiResponse = ApiResponse & {
  on: (event: "close", listener: () => void) => unknown
  flushHeaders: () => void
  writableEnded: boolean
  statusCode: number
}

const apiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = join(apiDirectory, "..", "..")
const routesDirectory = join(apiDirectory, "api")
const localEnvironmentPath = join(apiDirectory, ".env.local")
const maximumBodyBytes = 4_500_000

if (existsSync(localEnvironmentPath)) process.loadEnvFile(localEnvironmentPath)

const configuredPort = process.env.MOC_API_PORT?.trim()
const port = configuredPort ? Number(configuredPort) : 3001
const host = process.env.MOC_API_HOST?.trim() || "127.0.0.1"
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("MOC_API_PORT must be a valid TCP port")

async function listRouteFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listRouteFiles(path)
    return entry.isFile() && entry.name.endsWith(".ts") ? [path] : []
  }))
  return nestedFiles.flat().sort()
}

function escapeRegularExpression(value: string): string {
  const regularExpressionCharacters = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"])
  return Array.from(value, (character) => regularExpressionCharacters.has(character) ? "\\" + character : character).join("")
}

function createRouteDefinition(file: string): RouteDefinition {
  const segments = relative(routesDirectory, file).split(sep).map((segment, index, all) =>
    index === all.length - 1 ? segment.replace(/\.ts$/u, "") : segment,
  )
  const parameters: RouteParameter[] = []
  const patternSegments = segments.map((segment) => {
    const catchAll = /^\[\.\.\.(.+)\]$/u.exec(segment)
    if (catchAll) {
      parameters.push({ name: catchAll[1], catchAll: true })
      return "(.+)"
    }
    const parameter = /^\[(.+)\]$/u.exec(segment)
    if (parameter) {
      parameters.push({ name: parameter[1], catchAll: false })
      return "([^/]+)"
    }
    return escapeRegularExpression(segment)
  })
  const staticSegments = segments.filter((segment) => !segment.startsWith("[")).length
  return {
    file,
    pattern: new RegExp("^/api/" + patternSegments.join("/") + "/?$", "u"),
    parameters,
    specificity: staticSegments * 100 + segments.length,
  }
}

function queryFromUrl(url: URL): Record<string, string | string[] | undefined> {
  const query: Record<string, string | string[] | undefined> = {}
  for (const [name, value] of url.searchParams) {
    const existing = query[name]
    query[name] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value]
  }
  return query
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function matchRoute(routes: RouteDefinition[], url: URL): { route: RouteDefinition; query: ApiRequest["query"] } | null {
  for (const route of routes) {
    const match = route.pattern.exec(url.pathname)
    if (!match) continue
    const query = queryFromUrl(url)
    route.parameters.forEach((parameter, index) => {
      const rawValue = match[index + 1]
      if (rawValue === undefined) return
      const values = rawValue.split("/").map(decodePathSegment)
      query[parameter.name] = parameter.catchAll ? values : values[0]
    })
    return { route, query }
  }
  return null
}

function rewriteLocalPath(url: URL): URL {
  const rewrittenUrl = new URL(url)
  if (rewrittenUrl.pathname === "/api/public/submissions") {
    rewrittenUrl.pathname = "/api/notify/public-submissions"
  }
  return rewrittenUrl
}

function requestStatus(error: unknown): number {
  if (typeof error !== "object" || error === null || !("status" in error)) return 500
  const status = error.status
  return typeof status === "number" && status >= 400 && status <= 599 ? status : 500
}

function createResponse(response: ServerResponse): LocalApiResponse {
  // Keep the native writable stream intact for media pipelines and SSE.
  const apiResponse = response as ServerResponse & LocalApiResponse
  apiResponse.status = function status(code: number): LocalApiResponse {
    response.statusCode = code
    return apiResponse
  }
  apiResponse.json = function json(body: unknown): void {
    if (!response.hasHeader("Content-Type")) response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(JSON.stringify(body) ?? "null")
  }
  return apiResponse
}

async function readBody(request: IncomingMessage, parserDisabled: boolean): Promise<unknown> {
  if (parserDisabled || request.method === "GET" || request.method === "HEAD") return undefined
  const chunks: Buffer[] = []
  let size = 0
  const stream: AsyncIterable<Uint8Array | string> = request
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk)
    size += bytes.byteLength
    if (size > maximumBodyBytes) throw Object.assign(new Error("Request body is too large"), { status: 413 })
    chunks.push(bytes)
  }
  if (size === 0) return undefined
  const body = Buffer.concat(chunks, size)
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase()
  if (contentType === "application/json" || contentType?.endsWith("+json")) {
    try {
      return JSON.parse(body.toString("utf8")) as unknown
    } catch {
      throw Object.assign(new Error("Invalid JSON body"), { status: 400 })
    }
  }
  if (contentType === "application/x-www-form-urlencoded") {
    return Object.fromEntries(new URLSearchParams(body.toString("utf8")))
  }
  if (contentType?.startsWith("text/")) return body.toString("utf8")
  return body
}

function writeFailure(response: ServerResponse, error: unknown, method: string | undefined, pathname: string): void {
  const status = requestStatus(error)
  console.error("[local-api] request failed", {
    method: method ?? null,
    path: pathname,
    status,
    error: error instanceof Error ? error.name : "unknown",
  })
  if (response.headersSent) {
    response.end()
    return
  }
  const message = status === 400 ? "Invalid request body" : status === 413 ? "Request body is too large" : "Internal API error"
  createResponse(response).status(status).json({ error: message })
}

async function main(): Promise<void> {
  const routes = (await listRouteFiles(routesDirectory)).map(createRouteDefinition)
    .sort((left, right) => right.specificity - left.specificity)
  const vite = await createViteServer({
    root: repositoryRoot,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true },
  })
  const loadedRoutes = new Map<string, Promise<RouteModule>>()

  function loadRoute(file: string): Promise<RouteModule> {
    const existing = loadedRoutes.get(file)
    if (existing) return existing
    const loading = vite.ssrLoadModule(file).then((loaded) => {
      const route = loaded as RouteModule
      if (typeof route.default !== "function") throw new Error("API route has no default handler")
      return route
    })
    loadedRoutes.set(file, loading)
    return loading
  }

  const server = createHttpServer((incoming, outgoing) => {
    void (async () => {
      const requestUrl = new URL(incoming.url ?? "/", "http://localhost")
      const routedUrl = rewriteLocalPath(requestUrl)
      const matchedRoute = matchRoute(routes, routedUrl)
      const response = createResponse(outgoing)
      if (!matchedRoute) {
        response.status(404).json({ error: "Not found" })
        return
      }
      const route = await loadRoute(matchedRoute.route.file)
      const parserDisabled = route.config?.api?.bodyParser === false
      const body = await readBody(incoming, parserDisabled)
      const request: ApiRequest = {
        method: incoming.method,
        url: routedUrl.pathname + routedUrl.search,
        query: matchedRoute.query,
        headers: incoming.headers,
        body,
        ...(parserDisabled ? { [Symbol.asyncIterator]: () => incoming[Symbol.asyncIterator]() } : {}),
      }
      await route.default(request, response)
      if (!outgoing.writableEnded && !outgoing.headersSent) {
        response.status(204)
        outgoing.end()
      }
    })().catch((error: unknown) => {
      const pathname = new URL(incoming.url ?? "/", "http://localhost").pathname
      writeFailure(outgoing, error, incoming.method, pathname)
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, host, resolve)
  })
  console.info("[local-api] listening on http://" + host + ":" + port + " with " + routes.length + " API routes")

  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await vite.close()
    process.exit(0)
  }
  process.once("SIGINT", () => { void stop() })
  process.once("SIGTERM", () => { void stop() })
}

await main()
