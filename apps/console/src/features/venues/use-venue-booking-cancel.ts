import { useCallback, useState } from "react";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { getErrorMessage } from "@moc/utils/get-error-message";
import type { VenueBooking } from "@moc/types/venues";
import { cancelVenueBooking, restoreVenueBooking } from "@/data/mutate-venue-bookings";
import { useVenueBookings } from "./venue-bookings-provider";

/**
 * Cancel-with-reason and restore for a single detail surface (a drawer, or
 * the standalone detail screen). The kanban drag flow reuses this too, so
 * the reason modal and the "someone else booked those times" failure only
 * exist in one place.
 */
export function useVenueBookingCancel() {
    const { actions: { syncVenueBooking } } = useVenueBookings();
    const { toast } = useFeedback();
    const [cancelTarget, setCancelTarget] = useState<VenueBooking | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openCancelModal = useCallback((booking: VenueBooking) => {
        setCancelTarget(booking);
    }, []);

    const closeCancelModal = useCallback(() => {
        setCancelTarget(null);
    }, []);

    const confirmCancel = useCallback(async (reason: string) => {
        if (!cancelTarget) return;
        setIsSubmitting(true);
        try {
            const cancelled = await cancelVenueBooking(cancelTarget.id, reason);
            syncVenueBooking(cancelled);
            toast({ title: "Booking cancelled", variant: "success" });
            setCancelTarget(null);
        } catch (error) {
            toast({ title: "Failed to cancel booking", description: getErrorMessage(error, "The booking could not be cancelled."), variant: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }, [cancelTarget, syncVenueBooking, toast]);

    const restoreBooking = useCallback(async (booking: VenueBooking) => {
        setIsSubmitting(true);
        try {
            const restored = await restoreVenueBooking(booking.id);
            syncVenueBooking(restored);
            toast({ title: "Booking restored", variant: "success" });
            return true;
        } catch (error) {
            toast({ title: "Could not restore booking", description: getErrorMessage(error, "The booking could not be restored."), variant: "error" });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [syncVenueBooking, toast]);

    return {
        state: { cancelTarget, isSubmitting },
        actions: { openCancelModal, closeCancelModal, confirmCancel, restoreBooking },
    };
}
