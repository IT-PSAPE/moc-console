export type ProviderRecordsResource = "youtube-streams" | "zoom-meetings"

export type ProviderRecordsClientDependencies = {
  requestYouTube: (path: string, init?: RequestInit) => Promise<Response>
  requestZoom: (path: string, init?: RequestInit) => Promise<Response>
}

export type ProviderRecordsRequest = {
  id?: string
  workspaceId?: string
}

export async function requestProviderRecords<T>(
  resource: ProviderRecordsResource,
  { id, workspaceId }: ProviderRecordsRequest,
  dependencies: ProviderRecordsClientDependencies,
): Promise<T[]> {
  const query = id ? `?id=${encodeURIComponent(id)}` : ""
  const providerRequest = resource === "zoom-meetings"
    ? dependencies.requestZoom
    : dependencies.requestYouTube
  const response = await providerRequest(`/moc-records${query}`, {
    cache: "no-store",
    headers: workspaceId ? { "X-MOC-Workspace": workspaceId } : undefined,
  })

  if (!response.ok) throw new Error("Provider records could not be loaded")

  const body = await response.json() as { records?: unknown }
  if (!Array.isArray(body.records)) throw new Error("Provider records response was invalid")
  return body.records as T[]
}
