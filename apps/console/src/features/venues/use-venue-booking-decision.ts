import { useCallback, useState } from "react";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";
import type { VenueBooking } from "@moc/types/venues";
import { approveVenueBooking, rejectVenueBooking } from "@/data/mutate-venue-bookings";
import { useVenueBookings } from "./venue-bookings-provider";

/**
 * Approve-immediately and reject-with-confirmation for a single detail
 * surface (a drawer, the standalone detail screen, or the kanban drag flow).
 * Mirrors useVenueBookingCancel's shape so all three surfaces can compose
 * both hooks without duplicating the sync + toast boilerplate.
 */
export function useVenueBookingDecision() {
    const { actions: { syncVenueBooking } } = useVenueBookings();
    const { toast } = useFeedback();
    const [rejectTarget, setRejectTarget] = useState<VenueBooking | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const approveBooking = useCallback(async (booking: VenueBooking) => {
        setIsSubmitting(true);
        try {
            const approved = await approveVenueBooking(booking.id);
            syncVenueBooking(approved);
            toast({ title: "Booking approved", variant: "success" });
        } catch (error) {
            toast({ title: "Failed to approve booking", description: getErrorMessage(error, "The booking could not be approved."), variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }, [syncVenueBooking, toast]);

    const openRejectModal = useCallback((booking: VenueBooking) => {
        setRejectTarget(booking);
    }, []);

    const closeRejectModal = useCallback(() => {
        setRejectTarget(null);
    }, []);

    const confirmReject = useCallback(async () => {
        if (!rejectTarget) return;
        setIsSubmitting(true);
        try {
            const rejected = await rejectVenueBooking(rejectTarget.id);
            syncVenueBooking(rejected);
            toast({ title: "Booking rejected", variant: "success" });
            setRejectTarget(null);
        } catch (error) {
            toast({ title: "Failed to reject booking", description: getErrorMessage(error, "The booking could not be rejected."), variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }, [rejectTarget, syncVenueBooking, toast]);

    return {
        state: { rejectTarget, isSubmitting },
        actions: { approveBooking, openRejectModal, closeRejectModal, confirmReject },
    };
}
