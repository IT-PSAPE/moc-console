import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { createProviderRouter } from "../../server/routes/provider-router.js"
import oauth from "../../server/routes/zoom-oauth.js"
import proxy from "../../server/routes/zoom-proxy.js"

const handler = createProviderRouter({
  oauth,
  proxy: (request, response) => proxy(request, response as Parameters<typeof proxy>[1]),
}, "zoom")

export default async function zoomRoute(request: ApiRequest, response: ApiResponse): Promise<void> {
  await handler(request, response)
}
