import { Signal, Circle, Tag, CalendarDays, Clock } from 'lucide-react'
import { InfoList } from '@/components/ui/info-list'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime, formatLabel } from '@/lib/utils'
import type { CultureRequest } from '@/types'

interface RequestOverviewSectionProps {
  request: CultureRequest
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Not Started',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
}

export function RequestOverviewSection({ request }: RequestOverviewSectionProps) {
  return (
    <InfoList.Root withIcons>
      <InfoList.Item>
        <InfoList.Icon><Signal className="h-4 w-4" /></InfoList.Icon>
        <InfoList.Label>Status</InfoList.Label>
        <InfoList.Value>
          <span className="inline-flex items-center rounded-md border border-border-primary px-2 py-0.5 text-xs font-medium text-text-secondary">
          {STATUS_LABELS[request.status] ?? formatLabel(request.status)}
          </span>
        </InfoList.Value>
      </InfoList.Item>

      <InfoList.Item>
        <InfoList.Icon><Circle className="h-4 w-4" /></InfoList.Icon>
        <InfoList.Label>Priority</InfoList.Label>
        <InfoList.Value><StatusBadge status={request.priority} /></InfoList.Value>
      </InfoList.Item>

      <InfoList.Item>
        <InfoList.Icon><Tag className="h-4 w-4" /></InfoList.Icon>
        <InfoList.Label>Type</InfoList.Label>
        <InfoList.Value><StatusBadge status={request.type} /></InfoList.Value>
      </InfoList.Item>

      <InfoList.Item>
        <InfoList.Icon><CalendarDays className="h-4 w-4" /></InfoList.Icon>
        <InfoList.Label>Due Date</InfoList.Label>
        <InfoList.Value>{request.due_date ? formatDateTime(request.due_date) : '—'}</InfoList.Value>
      </InfoList.Item>

      <InfoList.Item>
        <InfoList.Icon><Clock className="h-4 w-4" /></InfoList.Icon>
        <InfoList.Label>Created Time</InfoList.Label>
        <InfoList.Value>{formatDateTime(request.created_at)}</InfoList.Value>
      </InfoList.Item>
    </InfoList.Root>
  )
}
