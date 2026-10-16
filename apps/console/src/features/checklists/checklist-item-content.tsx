import { CheckCircle2, ListChecks } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Checklist } from '@moc/types/checklists'
import { getChecklistCounts } from './checklist-content'

export function ChecklistItemContent({ checklist }: { checklist: Checklist }) {
    const { total, checked } = getChecklistCounts(checklist)
    const allDone = total > 0 && checked === total

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{checklist.name}</ListItemCard.Title>
                {checklist.description && <ListItemCard.Subtitle>{checklist.description}</ListItemCard.Subtitle>}
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem className={allDone ? 'text-success' : undefined} icon={<ListChecks />}>{checked} of {total} complete</ListItemCard.MetaItem>
                    {allDone && <ListItemCard.MetaItem className="text-success" icon={<CheckCircle2 />}>Complete</ListItemCard.MetaItem>}
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
