import type { RequestPriority } from '@/types/request'

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

export const PRIORITIES: RequestPriority[] = ['low', 'medium', 'high', 'urgent']
