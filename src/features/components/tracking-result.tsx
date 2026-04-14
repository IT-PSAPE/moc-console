import { Card } from '@/components/display/card'
import { Badge } from '@/components/display/badge'
import { MetaRow } from '@/components/display/meta-row'
import { Divider } from '@/components/display/divider'
import { Label, Paragraph } from '@/components/display/text'
import { Hash, FileText, Package, User, CalendarDays, Flag, Tag, CalendarCheck } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import type { TrackingResult as TrackingResultType } from '@/types/booking'
import type { RequestPriority, RequestCategory } from '@/types/request'

export function TrackingResult({ data }: { data: TrackingResultType }) {
  const isRequest = data.type === 'request'

  return (
    <div className="flex flex-col gap-4">
      <Card.Root>
        <Card.Header>
          <Label.sm>{isRequest ? 'Request' : 'Booking'}</Label.sm>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-3">
          <MetaRow icon={<Hash />} label="Tracking code">
            <span className="font-mono">{data.trackingCode}</span>
          </MetaRow>

          {isRequest && (
            <>
              {data.status && (
                <MetaRow icon={<Flag />} label="Status">
                  <Badge label={STATUS_LABELS[data.status] ?? data.status} color={STATUS_COLORS[data.status] ?? 'gray'} />
                </MetaRow>
              )}
              <MetaRow icon={<FileText />} label="Title">{data.title}</MetaRow>
              <MetaRow icon={<User />} label="Requested by">{data.requestedBy}</MetaRow>
              {data.priority && (
                <MetaRow icon={<Flag />} label="Priority">
                  <Badge label={PRIORITY_LABELS[data.priority as RequestPriority] ?? data.priority} color={PRIORITY_COLORS[data.priority as RequestPriority] ?? 'gray'} />
                </MetaRow>
              )}
              {data.category && (
                <MetaRow icon={<Tag />} label="Category">
                  <Badge label={CATEGORY_LABELS[data.category as RequestCategory] ?? data.category} color="blue" variant="outline" />
                </MetaRow>
              )}
              {data.dueDate && (
                <MetaRow icon={<CalendarDays />} label="Due date">{formatDate(data.dueDate)}</MetaRow>
              )}
            </>
          )}

          {!isRequest && (
            <>
              <MetaRow icon={<User />} label="Booked by">{data.bookedBy}</MetaRow>
              {data.checkedOutAt && (
                <MetaRow icon={<CalendarDays />} label="Checkout">{formatDateTime(data.checkedOutAt)}</MetaRow>
              )}
              {data.expectedReturnAt && (
                <MetaRow icon={<CalendarCheck />} label="Expected return">{formatDateTime(data.expectedReturnAt)}</MetaRow>
              )}
            </>
          )}

          <MetaRow icon={<CalendarDays />} label="Submitted">{formatDate(data.createdAt)}</MetaRow>
        </Card.Content>
      </Card.Root>

      {!isRequest && data.items && data.items.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Label.sm>Equipment ({data.items.length})</Label.sm>
          </Card.Header>
          <Card.Content className="flex flex-col gap-0 p-3">
            {data.items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Divider className="my-3" />}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-tertiary shrink-0" />
                    <Paragraph.sm>{item.equipmentName}</Paragraph.sm>
                  </div>
                  <Badge label={STATUS_LABELS[item.status] ?? item.status} color={STATUS_COLORS[item.status] ?? 'gray'} />
                </div>
              </div>
            ))}
          </Card.Content>
        </Card.Root>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
