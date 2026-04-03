import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { Settings } from 'lucide-react'

export function EquipmentMaintenanceScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<Settings />} title="Maintenance" description="Coming soon." />
        </Placeholder>
    )
}
