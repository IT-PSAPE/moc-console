import { KanbanBoard } from "@moc/ui/components/display/kanban-board"
import type { Booking } from "@moc/types/equipment"
import { useKanbanDrawerState } from "@/hooks/use-kanban-drawer-state"
import { BookingItem } from "./booking-item"

export function DraggableBookingItem({ booking }: { booking: Booking }) {
  const drawer = useKanbanDrawerState()

  return (
    <KanbanBoard.Item id={booking.id} data={{ booking }} disabled={drawer.state.isDrawerOpen}>
      <BookingItem booking={booking} onDrawerOpenChange={drawer.actions.setDrawerOpen} />
    </KanbanBoard.Item>
  )
}
