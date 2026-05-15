import { Badge } from '@moc/ui/components/display/badge'
import { MetaRow } from '@moc/ui/components/display/meta-row'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { User, FileText, Flag, CalendarDays, Tag, Users, MapPin, Clock, Target, Lightbulb, Wrench, StickyNote, GitBranch } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS } from '../constants'
import type { RequestFormData, RequestPriority } from '@/types/request'
import { formatDate } from '@/lib/utils'

export function RequestReview({ data }: { data: RequestFormData }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Basic Info</Label.xs>
        <div className="flex flex-col gap-3">
          <MetaRow icon={<FileText />} label="Title">
            <Label.sm>{data.title}</Label.sm>
          </MetaRow>
          <MetaRow icon={<User />} label="Requested by">
            <Label.sm>{data.requestedBy}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Flag />} label="Priority">
            <Badge label={PRIORITY_LABELS[data.priority]} color={PRIORITY_COLORS[data.priority as RequestPriority]} />
          </MetaRow>
          <MetaRow icon={<Tag />} label="Category">
            <Badge label={CATEGORY_LABELS[data.category]} color="blue" variant="outline" />
          </MetaRow>
          <MetaRow icon={<CalendarDays />} label="Due date">
            <Label.sm>{formatDate(data.dueDate)}</Label.sm>
          </MetaRow>
        </div>
      </section>

      <Divider />

      <section className="flex flex-col gap-3">
        <Label.xs className="text-tertiary uppercase tracking-wider">Details</Label.xs>
        <div className="flex flex-col gap-3 whitespace-pre-wrap">
          <MetaRow icon={<Users />} label="Who">
            <Label.sm>{data.who}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Target />} label="What">
            <Label.sm>{data.what}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Clock />} label="When">
            <Label.sm>{data.whenText}</Label.sm>
          </MetaRow>
          <MetaRow icon={<MapPin />} label="Where">
            <Label.sm>{data.whereText}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Lightbulb />} label="Why">
            <Label.sm>{data.why}</Label.sm>
          </MetaRow>
          <MetaRow icon={<Wrench />} label="How">
            <Label.sm>{data.how}</Label.sm>
          </MetaRow>
          {data.notes && <MetaRow icon={<StickyNote />} label="Notes">
            <Label.sm>{data.notes}</Label.sm>
          </MetaRow>}
        </div>
      </section>

      {data.flow && (
        <>
          <Divider />
          <section className="flex flex-col gap-3">
            <Label.xs className="text-tertiary uppercase tracking-wider">Flow</Label.xs>
            <div className="flex items-start gap-2">
              <GitBranch className="size-4 text-tertiary mt-0.5 shrink-0" />
              <Paragraph.sm className="whitespace-pre-wrap">{data.flow}</Paragraph.sm>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
