import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Indicator } from '@moc/ui/components/display/indicator'
import { Label } from '@moc/ui/components/display/text'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import type { ScheduleAgendaGroup, ScheduleAgendaItem } from './schedule-agenda'

type ScheduleAgendaListProps = { groups: ScheduleAgendaGroup[]; returnTo: string }

export function ScheduleAgendaList({ groups, returnTo }: ScheduleAgendaListProps) {
  function renderItem(item: ScheduleAgendaItem) {
    return <InteractiveSurface.CardLink key={item.id} render={<Link to={item.href} state={{ returnTo }} />} aria-label={item.accessibleLabel}>
      <ListItemCard.Root className="min-h-16 items-center">
        <ListItemCard.Leading className="h-auto w-24 self-center rounded-none bg-transparent text-left">
          <Label.xs className="w-full whitespace-normal font-mono font-normal text-tertiary">{item.timeLabel}</Label.xs>
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title title={item.title}>{item.title}</ListItemCard.Title>
          <ListItemCard.Subtitle className="flex items-center gap-1.5" title={item.detail}><Indicator.Dot color={item.color} aria-hidden="true" /><span className="min-w-0 truncate">{item.detail}</span></ListItemCard.Subtitle>
        </ListItemCard.Content>
      </ListItemCard.Root>
    </InteractiveSurface.CardLink>
  }
  function renderGroup(group: ScheduleAgendaGroup) {
    return <GroupedList.Group key={group.key} aria-label={group.label}>
      <GroupedList.Header className="gap-2 px-2">
        {group.relativeLabel && <Label.xs className={group.relativeLabel === 'Overdue' ? 'text-error' : 'text-brand'}>{group.relativeLabel}</Label.xs>}
        <h2><Label.xs>{group.label}</Label.xs></h2>
      </GroupedList.Header>
      <GroupedList.Content>{group.items.map(renderItem)}</GroupedList.Content>
    </GroupedList.Group>
  }
  return <section aria-label="Agenda" className="min-h-0 min-w-0 flex-1 overflow-y-auto p-2">
    {groups.length ? <GroupedList>{groups.map(renderGroup)}</GroupedList> : <EmptyState icon={<CalendarDays />} title="No work items" />}
  </section>
}
