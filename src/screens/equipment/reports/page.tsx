import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { BarChart3 } from 'lucide-react'

export function EquipmentReportsScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<BarChart3 />} title="Equipment Reports" description="Coming soon." />
        </Placeholder>
    )
}
