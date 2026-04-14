import { Card } from '@/components/display/card'
import { Badge } from '@/components/display/badge'
import { MetaRow } from '@/components/display/meta-row'
import { Label, Paragraph } from '@/components/display/text'
import { User, FileText, Flag, CalendarDays, Tag, Users, MapPin, Clock, Target, Lightbulb, Wrench, StickyNote, GitBranch } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS } from '../constants'
import type { RequestFormData, RequestPriority } from '@/types/request'

export function RequestReview({ data }: { data: RequestFormData }) {
  return (
    <div className="flex flex-col gap-4">
      <Card.Root>
        <Card.Header>
          <Label.sm>Basic Info</Label.sm>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-3">
          <MetaRow icon={<FileText />} label="Title">{data.title}</MetaRow>
          <MetaRow icon={<User />} label="Requested by">{data.requestedBy}</MetaRow>
          <MetaRow icon={<Flag />} label="Priority">
            <Badge label={PRIORITY_LABELS[data.priority]} color={PRIORITY_COLORS[data.priority as RequestPriority]} />
          </MetaRow>
          <MetaRow icon={<Tag />} label="Category">
            <Badge label={CATEGORY_LABELS[data.category]} color="blue" variant="outline" />
          </MetaRow>
          <MetaRow icon={<CalendarDays />} label="Due date">{formatDate(data.dueDate)}</MetaRow>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Label.sm>Details</Label.sm>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-3">
          <MetaRow icon={<Users />} label="Who">{data.who}</MetaRow>
          <MetaRow icon={<Target />} label="What">{data.what}</MetaRow>
          <MetaRow icon={<Clock />} label="When">{data.whenText}</MetaRow>
          <MetaRow icon={<MapPin />} label="Where">{data.whereText}</MetaRow>
          <MetaRow icon={<Lightbulb />} label="Why">{data.why}</MetaRow>
          <MetaRow icon={<Wrench />} label="How">{data.how}</MetaRow>
          {data.notes && <MetaRow icon={<StickyNote />} label="Notes">{data.notes}</MetaRow>}
        </Card.Content>
      </Card.Root>

      {data.flow && (
        <Card.Root>
          <Card.Header>
            <Label.sm>Flow</Label.sm>
          </Card.Header>
          <Card.Content className="p-3">
            <div className="flex items-start gap-2">
              <GitBranch className="size-4 text-tertiary mt-0.5 shrink-0" />
              <Paragraph.sm className="whitespace-pre-wrap">{data.flow}</Paragraph.sm>
            </div>
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
