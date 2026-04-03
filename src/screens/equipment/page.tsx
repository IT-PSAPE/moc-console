import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Wrench } from 'lucide-react'

export function EquipmentOverviewScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Wrench />} title="Equipment" description="Coming soon." />
        </Placeholder>
    )
}
