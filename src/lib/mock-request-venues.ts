import type { RequestVenue } from '@/types'

export const mockRequestVenues: RequestVenue[] = [
  {
    id: 'venue-001',
    name: 'Grand Conference Centre - Auditorium A',
    description: 'Large-format venue for summits, keynote sessions, and public broadcasts.',
    available: true,
  },
  {
    id: 'venue-002',
    name: 'Cultural District - Hall B',
    description: 'Flexible exhibition hall with booth layout support and visitor circulation routes.',
    available: true,
  },
  {
    id: 'venue-003',
    name: 'Music Academy - Rehearsal Rooms',
    description: 'Cluster of rehearsal rooms suited for youth programmes and ensemble practice.',
    available: false,
  },
  {
    id: 'venue-004',
    name: 'Archive Digitisation Lab',
    description: 'Controlled environment for archival scanning, review, and preservation work.',
    available: true,
  },
]
