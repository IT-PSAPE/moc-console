import type { ApiRequest, ApiResponse } from "./http.js"

export type ApiHandler = (request: ApiRequest, response: ApiResponse) => Promise<void>

function queryValue(request: ApiRequest, name: string): string | null {
  const value = request.query?.[name]
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function dispatchNamedRoute(
  request: ApiRequest,
  response: ApiResponse,
  parameter: string,
  routes: Readonly<Record<string, ApiHandler>>,
): Promise<void> {
  const name = queryValue(request, parameter)
  const handler = name ? routes[name] : undefined
  if (!handler) {
    response.status(404).json({ error: "Not found" })
    return
  }
  await handler(request, response)
}
