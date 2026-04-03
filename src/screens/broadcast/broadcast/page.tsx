import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Megaphone } from 'lucide-react'

export function BroadcastScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Megaphone />} title="Broadcast" description="Coming soon." />
        </Placeholder>
    )
}
