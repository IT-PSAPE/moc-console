import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Radio } from 'lucide-react'

export function BroadcastOverviewScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Radio />} title="Broadcast" description="Coming soon." />
        </Placeholder>
    )
}
