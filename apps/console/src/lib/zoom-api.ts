import { providerProxyPath } from "./provider-proxy-path"
import { checkProviderApiResponse } from "./provider-request-error"
import { moc } from "@/lib/moc-client"

/** Make an authenticated Zoom API call through the server-side token proxy. */
export async function zoomApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await moc.integrations.zoomRequest(providerProxyPath(path), {
    method: options.method,
    body: options.body,
    headers: options.headers,
    ...(options.signal ? { signal: options.signal } : {}),
  })
  return checkProviderApiResponse(response)
}

/** Revoke Zoom OAuth token. */
export async function revokeZoomToken(workspaceId: string): Promise<void> {
  await moc.integrations.revokeZoom(workspaceId)
}
