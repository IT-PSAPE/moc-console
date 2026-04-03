import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { CalendarDays } from 'lucide-react'

export function EquipmentBookingsScreen() {
    return (
        <Placeholder>
            <EmptyState icon={<CalendarDays />} title="Bookings" description="Coming soon." />
        </Placeholder>
    )
}
