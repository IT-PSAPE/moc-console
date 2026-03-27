import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockRequestMembers } from '@/lib/mock-request-members'
import { mockRequestVenues } from '@/lib/mock-request-venues'
import { mockEquipment } from '@/lib/mock-equipment'
import { mockMediaItems } from '@/lib/mock-media'

function fetchRequestSupportData() {
  return Promise.resolve({
    members: [...mockRequestMembers],
    venues: [...mockRequestVenues],
    equipment: [...mockEquipment],
    media: [...mockMediaItems],
  })
}

export function useRequestSupportData() {
  return useQuery({
    queryKey: queryKeys.requests.support(),
    queryFn: fetchRequestSupportData,
  })
}
