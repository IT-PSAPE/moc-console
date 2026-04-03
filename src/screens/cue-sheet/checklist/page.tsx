import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { ListChecks } from 'lucide-react'

export function CueSheetChecklistScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<ListChecks />} title="Checklist" description="Coming soon." />
        </Placeholder>
    )
}
