import { useCallback, useEffect } from "react";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import type { Booking } from "@moc/types/equipment";
import { getErrorMessage } from "@moc/utils/get-error-message";

const emptyBookings: Booking[] = [];

export function useEquipmentBookings(equipmentId: string, enabled = true) {
  const { currentWorkspaceId } = useWorkspace();
  const { toast } = useFeedback();
  const fetcher = useCallback((workspaceId: string) => workspaceId ? fetchBookingsByEquipmentId(equipmentId) : Promise.resolve(emptyBookings), [equipmentId]);
  const resource = useWorkspaceResource({ emptyValue: emptyBookings, fetcher, resource: `equipment-bookings:${equipmentId}`, workspaceId: currentWorkspaceId, enabled: enabled && Boolean(equipmentId) });
  const { load, data: bookings, error, isLoading } = resource;
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (error) toast({ title: "Failed to load booking history", description: getErrorMessage(error, "The booking history could not be loaded."), variant: "error" });
  }, [error, toast]);

  return { state: { bookings, isLoading }, actions: { refresh } };
}
