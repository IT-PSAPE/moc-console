import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { ClipboardList } from 'lucide-react'

export function CueSheetOverviewScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<ClipboardList />} title="Cue Sheet" description="Coming soon." />
        </Placeholder>
    )
}
