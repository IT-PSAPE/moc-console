import { Link } from 'react-router-dom'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Label } from '@moc/ui/components/display/text'
import { calendarEventColorClasses } from '@moc/ui/components/display/calendar-event-colors'
import { cn } from '@moc/utils/cn'
import type { ScheduleAgendaItem } from './schedule-agenda'
import { scheduleItemIcons } from './schedule-item-icons'

export function ScheduleEventRow({ item, returnTo }: { item: ScheduleAgendaItem; returnTo: string }) {
  const Icon = scheduleItemIcons[item.kind]
  return <InteractiveSurface.Link render={<Link to={item.href} state={{ returnTo }} />} aria-label={item.accessibleLabel} className={cn('block w-full min-w-0 rounded-md border transition-[filter] hover:brightness-95 active:brightness-90', calendarEventColorClasses[item.color ?? 'gray'])}>
    <ListItemCard.Root className="flex-nowrap items-start gap-x-2 px-2 py-2.5">
      <ListItemCard.Leading className="label-sm size-[1lh] rounded-none bg-transparent text-current [&_svg]:size-full"><Icon aria-hidden="true" /></ListItemCard.Leading>
      <ListItemCard.Content className="basis-0">
        <ListItemCard.Title className="flex items-baseline gap-2 text-current" title={item.title}>
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <Label.xs className="shrink-0 font-normal text-current opacity-80 tabular-nums">{item.timeLabel}</Label.xs>
        </ListItemCard.Title>
        <ListItemCard.Subtitle className="paragraph-xs whitespace-normal text-current opacity-80" title={item.detail}><span className="line-clamp-2">{item.detail}</span></ListItemCard.Subtitle>
      </ListItemCard.Content>
    </ListItemCard.Root>
  </InteractiveSurface.Link>
}
