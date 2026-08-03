import type { Checklist } from '@moc/types/checklists'
import { ResponsiveDetailAction } from '@/features/responsive-detail-action'
import { routes } from '@/screens/console-routes'
import { ChecklistItemContent } from './checklist-item-content'

export function ChecklistItemCard({ checklist, onSelect }: { checklist: Checklist; onSelect: (checklist: Checklist) => void }) {
    function handleSelect() {
        onSelect(checklist)
    }

    return (
        <ResponsiveDetailAction.Card mobileHref={`/${routes.checklists}/${checklist.id}`} onActivate={handleSelect}>
            <ChecklistItemContent checklist={checklist} />
        </ResponsiveDetailAction.Card>
    )
}
