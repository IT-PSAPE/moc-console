import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import type { Booking } from "@moc/types/equipment";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { useCallback, useEffect, useState } from "react";

export function useEquipmentBookings(equipmentId: string, enabled = true) {
  const { toast } = useFeedback();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!equipmentId) return;
    setIsLoading(true);
    try {
      setBookings(await fetchBookingsByEquipmentId(equipmentId));
    } catch (error) {
      toast({ title: "Failed to load booking history", description: getErrorMessage(error, "The booking history could not be loaded."), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [equipmentId, toast]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { state: { bookings, isLoading }, actions: { refresh } };
}
