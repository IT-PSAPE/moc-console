import type { ApiRequest, ApiResponse } from "../http.js"
import { routeParameterSegments, type ApiHandler } from "../route-dispatch.js"

export type ProviderRouteDependencies = { oauth: ApiHandler; proxy: ApiHandler }

export function createProviderRouter(dependencies: ProviderRouteDependencies, apiFamily: "youtube" | "zoom"): ApiHandler {
  return async function providerRouter(request: ApiRequest, response: ApiResponse): Promise<void> {
    const segments = routeParameterSegments(request, "path")
    const familyIndex = segments.indexOf(apiFamily)
    const routeSegments = familyIndex >= 0 ? segments.slice(familyIndex + 1) : segments
    if (routeSegments[0] === "oauth") {
      request.query = { ...request.query, action: routeSegments[1] }
      await dependencies.oauth(request, response)
      return
    }
    if (routeSegments[0] === "v3" || routeSegments[0] === "v2") {
      await dependencies.proxy(request, response)
      return
    }
    response.status(404).json({ error: "Not found" })
  }
}
