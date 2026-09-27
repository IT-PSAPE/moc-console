import { Indicator } from "@moc/ui/components/display/indicator";
import { KanbanBoard } from "@moc/ui/components/display/kanban-board";
import { Label } from "@moc/ui/components/display/text";
import type { VenueBooking } from "@moc/types/venues";
import { deriveVenueBookingSeriesPhase, venueBookingPhaseGroups } from "@moc/types/venues";
import { DraggableVenueBookingItem } from "./draggable-venue-booking-item";
import { VenueBookingItem } from "./venue-booking-item";
import { VenueBookingCancelModal } from "./venue-booking-cancel-modal";
import { VenueBookingRejectModal } from "./venue-booking-reject-modal";
import { useVenueBookingKanbanStatusChange } from "./use-venue-booking-kanban-status-change";
import { useVenueBookings } from "./venue-bookings-provider";

export function VenueBookingKanbanView({ bookings }: { bookings: VenueBooking[] }) {
    const { state: { at } } = useVenueBookings();
    const drag = useVenueBookingKanbanStatusChange();
    const { cancelTarget, isSubmitting } = drag.state.cancelModal;
    const { rejectTarget, isSubmitting: isRejecting } = drag.state.rejectModal;

    function handleCancelConfirm(reason: string) {
        void drag.actions.confirmCancel(reason);
    }

    function handleRejectOpenChange(open: boolean) {
        if (!open) drag.actions.closeRejectModal();
    }

    function handleRejectConfirm() {
        void drag.actions.confirmReject();
    }

    return (
        <>
            <KanbanBoard onDragStart={drag.actions.handleDragStart} onDragEnd={drag.actions.handleDragEnd}>
                <KanbanBoard.Columns>
                    {venueBookingPhaseGroups.map((group) => {
                        const items = bookings.filter((booking) => deriveVenueBookingSeriesPhase(booking.status, booking.occurrences, at, booking) === group.key);
                        return (
                            <KanbanBoard.Column key={group.key} id={group.key}>
                                <KanbanBoard.ColumnHeader>
                                    <Indicator color={group.color} className="size-6" />
                                    <Label.sm>{group.label}</Label.sm>
                                </KanbanBoard.ColumnHeader>
                                <KanbanBoard.ColumnContent>
                                    {items.map((booking) => (
                                        <DraggableVenueBookingItem key={booking.id} booking={booking} />
                                    ))}
                                </KanbanBoard.ColumnContent>
                            </KanbanBoard.Column>
                        );
                    })}
                </KanbanBoard.Columns>

                <KanbanBoard.Overlay>
                    {drag.state.activeItem && <VenueBookingItem booking={drag.state.activeItem} />}
                </KanbanBoard.Overlay>
            </KanbanBoard>
            <VenueBookingCancelModal
                open={cancelTarget !== null}
                onCancel={drag.actions.closeCancelModal}
                onConfirm={handleCancelConfirm}
                isCancelling={isSubmitting}
            />
            <VenueBookingRejectModal
                open={rejectTarget !== null}
                isRejecting={isRejecting}
                onOpenChange={handleRejectOpenChange}
                onConfirm={handleRejectConfirm}
            />
        </>
    );
}
