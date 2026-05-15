import { Badge } from '@moc/ui/components/display/badge'
import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Hash, FileText, Package, User, CalendarDays, Flag, Tag, CalendarCheck } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../constants'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { TrackingResult as TrackingResultType } from '@/types/booking'
import type { RequestPriority, RequestCategory } from '@/types/request'

export function TrackingResult({ data }: { data: TrackingResultType }) {
  const isRequest = data.type === 'request'

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">{isRequest ? 'Request' : 'Booking'}</Label.xs>
        <div className="flex flex-col gap-3">
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
        </div>
      </section>

      {!isRequest && data.items && data.items.length > 0 && (
        <>
          <Divider />
          <section className="flex flex-col gap-3">
            <Label.xs className="text-tertiary uppercase tracking-wider">Equipment ({data.items.length})</Label.xs>
            <div className="flex flex-col gap-0">
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
            </div>
          </section>
        </>
      )}
    </div>
  )
}
