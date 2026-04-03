import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Film } from 'lucide-react'

export function BroadcastMediaScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Film />} title="Media" description="Coming soon." />
        </Placeholder>
    )
}
