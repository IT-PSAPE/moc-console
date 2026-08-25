import { getCurrentWorkspaceId } from "@/data/current-workspace"
import { apiUrl } from "@moc/utils/api-url"
import { buildSessionHeaders } from "./api-auth"
import { requestProviderRecords, type ProviderRecordsRequest, type ProviderRecordsResource } from "./provider-records-request"

export type { ProviderRecordsResource } from "./provider-records-request"

export async function fetchProviderRecords<T>(
  resource: ProviderRecordsResource,
  request: ProviderRecordsRequest = {},
): Promise<T[]> {
  return requestProviderRecords<T>(resource, request, {
    buildSessionHeaders,
    getWorkspaceId: getCurrentWorkspaceId,
    request: fetch,
    resolveApiUrl: apiUrl,
  })
}
