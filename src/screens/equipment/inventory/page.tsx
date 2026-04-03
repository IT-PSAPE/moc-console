import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Package } from 'lucide-react'

export function EquipmentInventoryScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Package />} title="Inventory" description="Coming soon." />
        </Placeholder>
    )
}
