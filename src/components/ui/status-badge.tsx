import { formatLabel } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'dot'
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  approved: 'bg-utility-success-50 text-utility-success-700 border-utility-success-200',
  rejected: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  in_review: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-200',
  available: 'bg-utility-success-50 text-utility-success-700 border-utility-success-200',
  assigned: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-200',
  maintenance: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  retired: 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200',
  draft: 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  live: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  completed: 'bg-utility-success-50 text-utility-success-700 border-utility-success-200',
  cancelled: 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200',
  low: 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200',
  medium: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-200',
  high: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  urgent: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  excellent: 'bg-utility-success-50 text-utility-success-700 border-utility-success-200',
  good: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-200',
  fair: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  poor: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  event: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  program: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-200',
  venue: 'bg-purple-50 text-purple-700 border-purple-200',
  equipment: 'bg-utility-warning-50 text-utility-warning-700 border-utility-warning-200',
  media: 'bg-utility-error-50 text-utility-error-700 border-utility-error-200',
  other: 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200',
}

const DOT_COLORS: Record<string, string> = {
  pending: 'bg-utility-warning-500',
  approved: 'bg-utility-success-500',
  rejected: 'bg-utility-error-500',
  in_review: 'bg-utility-blue-500',
  available: 'bg-utility-success-500',
  assigned: 'bg-utility-blue-500',
  maintenance: 'bg-utility-warning-500',
  retired: 'bg-utility-gray-400',
  live: 'bg-utility-error-500',
  scheduled: 'bg-purple-500',
  completed: 'bg-utility-success-500',
  draft: 'bg-utility-gray-400',
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-utility-gray-100 text-utility-gray-600 border-utility-gray-200'

  if (variant === 'dot') {
    const dot = DOT_COLORS[status] ?? 'bg-utility-gray-400'
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {formatLabel(status)}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {formatLabel(status)}
    </span>
  )
}
