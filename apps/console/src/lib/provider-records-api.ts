import { requestProviderRecords, type ProviderRecordsRequest, type ProviderRecordsResource } from "./provider-records-request"
import { youtubeApiFetch } from "./youtube-client"
import { zoomApiFetch } from "./zoom-client"

export type { ProviderRecordsResource } from "./provider-records-request"

export async function fetchProviderRecords<T>(
  resource: ProviderRecordsResource,
  request: ProviderRecordsRequest = {},
): Promise<T[]> {
  return requestProviderRecords<T>(resource, request, {
    requestYouTube: youtubeApiFetch,
    requestZoom: zoomApiFetch,
  })
}
