import { KanbanBoard } from '@moc/ui/components/display/kanban-board'
import type { VenueBooking } from '@moc/types/venues'
import { VenueBookingItem } from './venue-booking-item'
import { useKanbanDrawerState } from '@/hooks/use-kanban-drawer-state'

export function DraggableVenueBookingItem({ booking }: { booking: VenueBooking }) {
  const drawer = useKanbanDrawerState()
  return (
    <KanbanBoard.Item id={booking.id} data={{ venueBooking: booking }} disabled={drawer.state.isDrawerOpen}>
      <VenueBookingItem booking={booking} onDrawerOpenChange={drawer.actions.setDrawerOpen} />
    </KanbanBoard.Item>
  )
}
