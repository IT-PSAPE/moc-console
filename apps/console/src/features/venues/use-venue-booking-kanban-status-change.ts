import { useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { VenueBooking, VenueBookingPhase } from "@moc/types/venues";
import { deriveVenueBookingSeriesPhase } from "@moc/types/venues";
import { useVenueBookingCancel } from "./use-venue-booking-cancel";
import { useVenueBookingDecision } from "./use-venue-booking-decision";
import { useVenueBookings } from "./venue-bookings-provider";
import { getVenueBookingStatusFlags } from "./venue-booking-status-flags";

/**
 * Kanban drag rules for venue bookings, following the shape of
 * useKanbanStatusChange/useRequestKanbanStatusChange but not built on the
 * generic hook: only 'cancelled', 'approved' and 'rejected' are real drop
 * targets, so dragging into a derived column (booked/in_progress/completed)
 * is refused outright — the card is never optimistically moved, so it simply
 * stays put. Dragging into Cancelled or Rejected opens a confirmation from
 * useVenueBookingCancel/useVenueBookingDecision; dragging into Approved
 * approves immediately. Dragging a cancelled or rejected card back out
 * restores it, which can fail if its slots were claimed by someone else in
 * the meantime.
 */
export function useVenueBookingKanbanStatusChange() {
    const { state: { at } } = useVenueBookings();
    const cancel = useVenueBookingCancel();
    const decision = useVenueBookingDecision();
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
        const currentPhase = deriveVenueBookingSeriesPhase(booking.status, booking.occurrences, at, booking);
        if (targetPhase === currentPhase) return;

        const flags = getVenueBookingStatusFlags(booking);

        if (targetPhase === "cancelled") {
            if (!flags.canCancel) return;
            cancel.actions.openCancelModal(booking);
            return;
        }

        if (targetPhase === "rejected") {
            if (!flags.canReject) return;
            decision.actions.openRejectModal(booking);
            return;
        }

        if (targetPhase === "approved") {
            if (!flags.canApprove) return;
            await decision.actions.approveBooking(booking);
            return;
        }

        if (currentPhase !== "cancelled" && currentPhase !== "rejected") return;
        if (!flags.canRestore) return;

        await cancel.actions.restoreBooking(booking);
    }

    return {
        state: { activeItem, cancelModal: cancel.state, rejectModal: decision.state },
        actions: {
            handleDragStart,
            handleDragEnd,
            confirmCancel: cancel.actions.confirmCancel,
            closeCancelModal: cancel.actions.closeCancelModal,
            confirmReject: decision.actions.confirmReject,
            closeRejectModal: decision.actions.closeRejectModal,
        },
    };
}
