import { Indicator } from "@moc/ui/components/display/indicator"
import { KanbanBoard } from "@moc/ui/components/display/kanban-board"
import { Label } from "@moc/ui/components/display/text"
import type { Booking } from "@moc/types/equipment"
import { bookingStatusGroup } from "@moc/types/equipment"
import { BookingItem } from "./booking-item"
import { DraggableBookingItem } from "./draggable-booking-item"
import { useBookingKanbanStatusChange } from "./use-booking-kanban-status-change"

export function BookingKanbanView({ bookings }: { bookings: Booking[] }) {
  const drag = useBookingKanbanStatusChange()

  return (
    <KanbanBoard onDragStart={drag.actions.handleDragStart} onDragEnd={drag.actions.handleDragEnd}>
      <KanbanBoard.Columns>
        {bookingStatusGroup.map((group) => {
          const items = bookings.filter((booking) => booking.status === group.key)

          return (
            <KanbanBoard.Column key={group.key} id={group.key}>
              <KanbanBoard.ColumnHeader>
                <Indicator color={group.color} className="size-6" />
                <Label.sm>{group.label}</Label.sm>
              </KanbanBoard.ColumnHeader>
              <KanbanBoard.ColumnContent>
                {items.map((booking) => <DraggableBookingItem key={booking.id} booking={booking} />)}
              </KanbanBoard.ColumnContent>
            </KanbanBoard.Column>
          )
        })}
      </KanbanBoard.Columns>

      <KanbanBoard.Overlay>
        {drag.state.activeItem && <BookingItem booking={drag.state.activeItem} />}
      </KanbanBoard.Overlay>
    </KanbanBoard>
  )
}
