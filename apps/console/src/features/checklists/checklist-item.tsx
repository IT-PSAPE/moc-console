import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Badge } from '@moc/ui/components/display/badge'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { cv } from '@moc/utils/cv'
import type { Checklist } from '@moc/types/checklists'
import { CalendarClock, CheckCircle2, ListChecks } from 'lucide-react'
import { ChecklistDrawer } from './checklist-drawer'
import { getChecklistCounts } from './checklist-content'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'
import { ResponsiveDrawerTrigger } from '@/features/responsive-drawer-trigger'
import { routes } from '@/screens/console-routes'

const itemVariants = cv({
    base: [
        'flex w-full justify-between gap-4 px-4 py-3 *:flex-1',
        'items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full',
    ],
})

function formatScheduledAt(scheduledAt?: string) {
    if (!scheduledAt) return null
    return formatUtcIsoInBrowserTimeZone(scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ChecklistItemCard({ checklist }: { checklist: Checklist }) {
    const { total, checked } = getChecklistCounts(checklist)
    const allDone = total > 0 && checked === total
    const scheduledAt = formatScheduledAt(checklist.scheduledAt)

    return (
        <Drawer>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.checklists}/${checklist.id}`} className={itemVariants()}>
                    <div>
                        <Label.sm>{checklist.name}</Label.sm>
                        <Paragraph.sm className="text-tertiary">{checklist.description}</Paragraph.sm>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {scheduledAt && <Badge label={scheduledAt} icon={<CalendarClock />} color="purple" />}
                        <Badge
                            label={`${checked}/${total}`}
                            icon={<ListChecks />}
                            color={allDone ? 'green' : 'gray'}
                        />
                        {allDone && (
                            <Badge label="Complete" icon={<CheckCircle2 />} color="green" />
                        )}
                    </div>
            </ResponsiveDrawerTrigger.Card>
            <ChecklistDrawer checklist={checklist} />
        </Drawer>
    )
}
