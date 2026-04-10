import { Label, Paragraph } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { Drawer } from '@/components/overlays/drawer'
import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import type { Checklist } from '@/types/cue-sheet'
import { CalendarClock, CheckCircle2, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { ChecklistDrawer } from './checklist-drawer'
import { getChecklistCounts } from './checklist-content'

const itemVariants = cv({
    base: [
        'w-full flex justify-between px-4 py-3 gap-4 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary *:flex-1',
        'items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full',
    ],
})

function formatScheduledAt(scheduledAt?: string) {
    if (!scheduledAt) return null
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduledAt))
}

export function ChecklistItemCard({ checklist }: { checklist: Checklist }) {
    const [open, setOpen] = useState(false)
    const { total, checked } = getChecklistCounts(checklist)
    const allDone = total > 0 && checked === total
    const scheduledAt = formatScheduledAt(checklist.scheduledAt)

    return (
        <Drawer.Root open={open} onOpenChange={setOpen}>
            <Drawer.Trigger>
                <div className={cn(itemVariants(), 'cursor-pointer hover:bg-background-primary-hover transition-colors')}>
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
                </div>
            </Drawer.Trigger>
            <ChecklistDrawer checklist={checklist} />
        </Drawer.Root>
    )
}
