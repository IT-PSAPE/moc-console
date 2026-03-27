import type { CultureRequest, RequestFlow, RequestType } from '@/types'

export const REQUEST_STEPS = ['Basics', '5W + 1H', 'Resources', 'Review'] as const

export const REQUEST_STATUS_OPTIONS: { label: string; value: RequestFlow }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Completed', value: 'completed' },
]

export const REQUEST_TYPE_OPTIONS: { label: string; value: RequestType }[] = [
  { label: 'Event', value: 'event' },
  { label: 'Program', value: 'program' },
  { label: 'Venue', value: 'venue' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Media', value: 'media' },
  { label: 'Other', value: 'other' },
]

export const REQUEST_PRIORITY_OPTIONS: { label: string; value: CultureRequest['priority'] }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

export const REQUEST_TYPE_NOTICE: Record<RequestType, { days: number; warning: string }> = {
  event: {
    days: 14,
    warning: 'Event requests should usually be submitted at least 14 days before the due date.',
  },
  program: {
    days: 10,
    warning: 'Programme requests work best with at least 10 days of notice.',
  },
  venue: {
    days: 7,
    warning: 'Venue requests should normally include at least 7 days of notice.',
  },
  equipment: {
    days: 5,
    warning: 'Equipment requests should normally include at least 5 days of notice.',
  },
  media: {
    days: 5,
    warning: 'Media requests should normally include at least 5 days of notice.',
  },
  other: {
    days: 3,
    warning: 'This request type is best submitted at least 3 days in advance.',
  },
}
