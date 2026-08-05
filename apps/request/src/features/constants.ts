import type { RequestPriority, RequestCategory } from '@/types/request'

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLORS: Record<RequestPriority, 'gray' | 'blue' | 'yellow' | 'red'> = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
}

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  video_production: 'Video Production',
  video_shooting: 'Video Shooting',
  graphic_design: 'Graphic Design',
  event: 'Event',
  education: 'Education',
}

export const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
  booked: 'Booked',
  checked_out: 'Checked Out',
  returned: 'Returned',
}

export const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'purple' | 'red'> = {
  not_started: 'gray',
  in_progress: 'blue',
  completed: 'green',
  archived: 'purple',
  booked: 'blue',
  checked_out: 'yellow',
  returned: 'green',
}

export const REQUEST_STEPS = [
  { label: 'Basic Info' },
  { label: 'Details' },
  { label: 'Flow' },
  { label: 'Review' },
]

export const BOOKING_STEPS = [
  { label: 'Details' },
  { label: 'Equipment' },
  { label: 'Review' },
]

export const PRIORITIES: RequestPriority[] = ['low', 'medium', 'high', 'urgent']
export const CATEGORIES: RequestCategory[] = ['video_production', 'video_shooting', 'graphic_design', 'event', 'education']
