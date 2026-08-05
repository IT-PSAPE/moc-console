import { updateBooking } from "@/data/mutate-booking";
import { useEditableStore } from "@/hooks/use-editable-store";
import type { Booking } from "@moc/types/equipment";

type UseBookingStoreOptions = {
  syncBooking?: (booking: Booking) => void;
};

export function useBookingStore(initialBooking: Booking, options?: UseBookingStoreOptions) {
  return useEditableStore(initialBooking, {
    persist: updateBooking,
    errorMessage: "Booking could not be saved. Please review the booking details and try again.",
    sync: options?.syncBooking,
    restoreDraftOnError: false,
  });
}
