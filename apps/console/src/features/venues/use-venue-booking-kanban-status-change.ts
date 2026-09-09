import { useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { VenueBooking, VenueBookingPhase } from "@moc/types/venues";
import { deriveVenueBookingPhase } from "@moc/types/venues";
import { useVenueBookingCancel } from "./use-venue-booking-cancel";
import { useVenueBookings } from "./venue-bookings-provider";

/**
 * Kanban drag rules for venue bookings, following the shape of
 * useKanbanStatusChange/useRequestKanbanStatusChange but not built on the
 * generic hook: only 'cancelled' is a real drop target, so dragging into a
 * derived column (booked/in_progress/completed) is refused outright — the
 * card is never optimistically moved, so it simply stays put. Dragging into
 * Cancelled opens the reason modal from useVenueBookingCancel; dragging a
 * cancelled card back out restores it, which can fail if its slots were
 * claimed by someone else while it was cancelled.
 */
export function useVenueBookingKanbanStatusChange() {
    const { state: { at } } = useVenueBookings();
    const cancel = useVenueBookingCancel();
    const [activeItem, setActiveItem] = useState<VenueBooking | null>(null);

    function getEventBooking(event: DragStartEvent | DragEndEvent): VenueBooking | null {
        return (event.active.data.current?.venueBooking as VenueBooking | undefined) ?? null;
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveItem(getEventBooking(event));
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveItem(null);
        const booking = getEventBooking(event);
        if (!booking || !event.over) return;

        const targetPhase = event.over.id as VenueBookingPhase;
        const currentPhase = deriveVenueBookingPhase(booking.status, booking.startsAt, booking.endsAt, at);
        if (targetPhase === currentPhase) return;

        if (targetPhase === "cancelled") {
            cancel.actions.openCancelModal(booking);
            return;
        }

        if (currentPhase !== "cancelled") return;

        await cancel.actions.restoreBooking(booking);
    }

    return {
        state: { activeItem, cancelModal: cancel.state },
        actions: {
            handleDragStart,
            handleDragEnd,
            confirmCancel: cancel.actions.confirmCancel,
            closeCancelModal: cancel.actions.closeCancelModal,
        },
    };
}
