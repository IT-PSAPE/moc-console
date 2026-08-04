import { fetchBookings, fetchEquipment } from "@/data/fetch-equipment";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { useWorkspace } from "@/lib/workspace-context";
import type { Booking } from "@moc/types/equipment/booking";
import type { Equipment } from "@moc/types/equipment/equipment";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type EquipmentContextValue = {
  state: {
    equipment: Equipment[];
    bookings: Booking[];
    isLoadingEquipment: boolean;
    isLoadingBookings: boolean;
    equipmentError: Error | null;
    bookingsError: Error | null;
  };
  actions: {
    loadEquipment: () => Promise<void>;
    refreshEquipment: () => Promise<void>;
    retryEquipment: () => Promise<void>;
    loadBookings: () => Promise<void>;
    retryBookings: () => Promise<void>;
    addEquipment: (equipment: Equipment) => void;
    syncEquipment: (equipment: Equipment) => void;
    removeEquipment: (id: string) => void;
    syncBooking: (booking: Booking) => void;
    removeBooking: (id: string) => void;
    removeBookingItemsByEquipmentId: (equipmentId: string) => void;
  };
};

const EquipmentContext = createContext<EquipmentContextValue | null>(null);
const emptyEquipment: Equipment[] = [];
const emptyBookings: Booking[] = [];

export function EquipmentProvider({ children }: { children: ReactNode }) {
  const { currentWorkspaceId } = useWorkspace();
  const { data: equipment, error: equipmentError, isLoading: isLoadingEquipment, load: loadEquipmentResource, updateData: updateEquipment } = useWorkspaceResource({ emptyValue: emptyEquipment, fetcher: fetchEquipment, resource: "equipment", workspaceId: currentWorkspaceId });
  const { data: bookings, error: bookingsError, isLoading: isLoadingBookings, load: loadBookingsResource, updateData: updateBookings } = useWorkspaceResource({ emptyValue: emptyBookings, fetcher: fetchBookings, resource: "bookings", workspaceId: currentWorkspaceId });

  const addEquipment = useCallback((newItem: Equipment) => {
    updateEquipment((current) => [newItem, ...current]);
  }, [updateEquipment]);

  const syncEquipment = useCallback((updated: Equipment) => {
    updateEquipment((current) => current.map((item) => item.id === updated.id ? updated : item));
  }, [updateEquipment]);

  const removeEquipment = useCallback((id: string) => {
    updateEquipment((current) => current.filter((item) => item.id !== id));
  }, [updateEquipment]);

  const syncBooking = useCallback((updated: Booking) => {
    updateBookings((current) => {
      const exists = current.some((booking) => booking.id === updated.id);
      if (!exists) return [updated, ...current];
      return current.map((booking) => booking.id === updated.id ? updated : booking);
    });
  }, [updateBookings]);

  const removeBooking = useCallback((id: string) => {
    updateBookings((current) => current.filter((booking) => booking.id !== id));
  }, [updateBookings]);

  const removeBookingItemsByEquipmentId = useCallback((equipmentId: string) => {
    updateBookings((current) =>
      current.map((booking) => ({
        ...booking,
        items: booking.items.filter((item) => item.equipmentId !== equipmentId),
      })),
    );
  }, [updateBookings]);

  const loadEquipment = useCallback(async () => {
    await loadEquipmentResource();
  }, [loadEquipmentResource]);

  const refreshEquipment = useCallback(async () => {
    await loadEquipmentResource(true);
  }, [loadEquipmentResource]);

  const retryEquipment = useCallback(async () => {
    await loadEquipmentResource(true);
  }, [loadEquipmentResource]);

  const loadBookings = useCallback(async () => {
    await loadBookingsResource();
  }, [loadBookingsResource]);

  const retryBookings = useCallback(async () => {
    await loadBookingsResource(true);
  }, [loadBookingsResource]);

  const value = useMemo<EquipmentContextValue>(
    () => ({
      state: {
        equipment,
        bookings,
        isLoadingEquipment,
        isLoadingBookings,
        equipmentError,
        bookingsError,
      },
      actions: { loadEquipment, refreshEquipment, retryEquipment, loadBookings, retryBookings, addEquipment, syncEquipment, removeEquipment, syncBooking, removeBooking, removeBookingItemsByEquipmentId },
    }),
    [addEquipment, bookings, bookingsError, equipment, equipmentError, isLoadingBookings, isLoadingEquipment, loadBookings, loadEquipment, refreshEquipment, removeBooking, removeBookingItemsByEquipmentId, removeEquipment, retryBookings, retryEquipment, syncBooking, syncEquipment],
  );

  return <EquipmentContext.Provider value={value}>{children}</EquipmentContext.Provider>;
}

export function useEquipment() {
  const context = useContext(EquipmentContext);

  if (!context) {
    throw new Error("useEquipment must be used within an EquipmentProvider");
  }

  return context;
}
