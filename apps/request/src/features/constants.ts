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
