import type { VenueBooking } from "@moc/types/venues";

export type VenueBookingStatusFlags = {
    canApprove: boolean;
    canReject: boolean;
    canCancel: boolean;
    canRestore: boolean;
};

/**
 * Which staff decisions the booking's stored status allows right now,
 * mirroring api_apply_telegram_action's transitions: approve only from
 * 'auto', reject from 'auto' or 'approved', restore from 'cancelled' or
 * 'rejected'. Cancel applies to bookings that still hold their slots.
 */
export function getVenueBookingStatusFlags(booking: VenueBooking): VenueBookingStatusFlags {
    return {
        canApprove: booking.status === "auto",
        canReject: booking.status === "auto" || booking.status === "approved",
        canCancel: booking.status === "auto" || booking.status === "approved",
        canRestore: booking.status === "cancelled" || booking.status === "rejected",
    };
}
