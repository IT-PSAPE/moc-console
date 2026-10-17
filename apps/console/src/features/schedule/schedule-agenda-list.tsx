import { CalendarDays } from 'lucide-react'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { Label } from '@moc/ui/components/display/text'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import type { ScheduleAgendaGroup, ScheduleAgendaItem } from './schedule-agenda'
import { ScheduleEventRow } from './schedule-event-row'

type ScheduleAgendaListProps = { groups: ScheduleAgendaGroup[]; returnTo: string }

export function ScheduleAgendaList({ groups, returnTo }: ScheduleAgendaListProps) {
  function renderItem(item: ScheduleAgendaItem) {
    return <ScheduleEventRow key={item.id} item={item} returnTo={returnTo} />
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
