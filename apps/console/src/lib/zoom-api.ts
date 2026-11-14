import type { ProviderRequestOptions } from "@moc/sdk/integrations"
import { providerProxyPath } from "./provider-proxy-path"
import { checkProviderApiResponse } from "./provider-request-error"
import { moc } from "@/lib/moc-client"

/** Make an authenticated Zoom API call through the server-side token proxy. */
export async function zoomApiFetch(path: string, options: ProviderRequestOptions & { workspaceId: string }): Promise<Response> {
  if (!options.workspaceId) throw new Error("Select a workspace before contacting Zoom")
  const response = await moc.integrations.zoomRequest(providerProxyPath(path), options)
  return checkProviderApiResponse(response)
}

/** Revoke Zoom OAuth token. */
export async function revokeZoomToken(workspaceId: string): Promise<void> {
  await moc.integrations.revokeZoom(workspaceId)
}
