export type ProviderRecordsResource = "youtube-streams" | "zoom-meetings"

export type ProviderRecordsClientDependencies = {
  buildSessionHeaders: () => Promise<Record<string, string>>
  getWorkspaceId: () => Promise<string>
  request: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  resolveApiUrl: (path: string) => string
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
  const [sessionHeaders, resolvedWorkspaceId] = await Promise.all([
    dependencies.buildSessionHeaders(),
    workspaceId ? Promise.resolve(workspaceId) : dependencies.getWorkspaceId(),
  ])
  const query = id ? `?id=${encodeURIComponent(id)}` : ""
  const response = await dependencies.request(
    dependencies.resolveApiUrl(`/api/provider-records/${resource}${query}`),
    {
      cache: "no-store",
      headers: {
        "X-MOC-Workspace": resolvedWorkspaceId,
        ...sessionHeaders,
      },
    },
  )

  if (!response.ok) throw new Error("Provider records could not be loaded")

  const body = await response.json() as { records?: unknown }
  if (!Array.isArray(body.records)) throw new Error("Provider records response was invalid")
  return body.records as T[]
}
