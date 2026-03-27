import { Signal, Circle, Tag, CalendarDays, Clock } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime, formatLabel } from '@/lib/utils'
import type { CultureRequest } from '@/types'
import type { ReactNode } from 'react'

interface RequestOverviewSectionProps {
  request: CultureRequest
  onStatusChange: (status: CultureRequest['status']) => void
  onPriorityChange: (priority: CultureRequest['priority']) => void
  onTypeChange: (type: CultureRequest['type']) => void
  onDueDateChange: (value: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Not Started',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
}

function PropertyRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-text-quaternary">{icon}</span>
      <span className="w-28 shrink-0 text-sm text-text-secondary">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function RequestOverviewSection({ request }: RequestOverviewSectionProps) {
  return (
    <section className="space-y-0.5">
      <PropertyRow icon={<Signal className="h-4 w-4" />} label="Status">
        <span className="inline-flex items-center rounded-md border border-border-primary px-2 py-0.5 text-xs font-medium text-text-secondary">
          {STATUS_LABELS[request.status] ?? formatLabel(request.status)}
        </span>
      </PropertyRow>

      <PropertyRow icon={<Circle className="h-4 w-4" />} label="Priority">
        <StatusBadge status={request.priority} />
      </PropertyRow>

      <PropertyRow icon={<Tag className="h-4 w-4" />} label="Type">
        <StatusBadge status={request.type} />
      </PropertyRow>

      <PropertyRow icon={<CalendarDays className="h-4 w-4" />} label="Due Date">
        <span className="text-text-primary">
          {request.due_date ? formatDateTime(request.due_date) : '—'}
        </span>
      </PropertyRow>

      <PropertyRow icon={<Clock className="h-4 w-4" />} label="Created time">
        <span className="text-text-primary">{formatDateTime(request.created_at)}</span>
      </PropertyRow>
    </section>
  )
}
