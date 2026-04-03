import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Calendar } from 'lucide-react'

export function CueSheetEventScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Calendar />} title="Events" description="Coming soon." />
        </Placeholder>
    )
}
