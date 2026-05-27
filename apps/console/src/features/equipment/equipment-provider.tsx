import { fetchEquipment, fetchBookings } from "@/data/fetch-equipment";
import type { Equipment } from "@moc/types/equipment/equipment";
import type { Booking } from "@moc/types/equipment/booking";
import { useWorkspace } from "@/lib/workspace-context";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type EquipmentContextValue = {
  state: {
    equipment: Equipment[];
    bookings: Booking[];
    isLoadingEquipment: boolean;
    isLoadingBookings: boolean;
  };
  actions: {
    loadEquipment: () => Promise<void>;
    refreshEquipment: () => Promise<void>;
    loadBookings: () => Promise<void>;
    addEquipment: (equipment: Equipment) => void;
    syncEquipment: (equipment: Equipment) => void;
    removeEquipment: (id: string) => void;
    syncBooking: (booking: Booking) => void;
    removeBooking: (id: string) => void;
    removeBookingItemsByEquipmentId: (equipmentId: string) => void;
  };
};

const EquipmentContext = createContext<EquipmentContextValue | null>(null);

export function EquipmentProvider({ children }: { children: ReactNode }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const equipmentLoadedRef = useRef<string | null>(null);
  const equipmentPromiseRef = useRef<Promise<void> | null>(null);
  const bookingsLoadedRef = useRef<string | null>(null);
  const bookingsPromiseRef = useRef<Promise<void> | null>(null);

  const { currentWorkspaceId } = useWorkspace();
  const [trackedWorkspaceId, setTrackedWorkspaceId] = useState(currentWorkspaceId);
  if (trackedWorkspaceId !== currentWorkspaceId) {
    setTrackedWorkspaceId(currentWorkspaceId);
    setEquipment([]);
    setBookings([]);
  }

  const addEquipment = useCallback((newItem: Equipment) => {
    setEquipment((prev) => [newItem, ...prev]);
  }, []);

  const syncEquipment = useCallback((updated: Equipment) => {
    setEquipment((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const removeEquipment = useCallback((id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const syncBooking = useCallback((updated: Booking) => {
    setBookings((prev) => {
      const exists = prev.some((booking) => booking.id === updated.id);
      if (!exists) {
        return [updated, ...prev];
      }

      return prev.map((booking) => (booking.id === updated.id ? updated : booking));
    });
  }, []);

  const removeBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((booking) => booking.id !== id));
  }, []);

  // Equipment deletion cascades through booking_items in the database
  // (ON DELETE CASCADE). The booking row itself survives — possibly with
  // zero items — as an audit trail of the original submission. The local
  // mirror drops only the matching item from each booking's items array.
  const removeBookingItemsByEquipmentId = useCallback((equipmentId: string) => {
    setBookings((prev) =>
      prev.map((booking) => ({
        ...booking,
        items: booking.items.filter((item) => item.equipmentId !== equipmentId),
      })),
    );
  }, []);

  const loadEquipment = useCallback(async () => {
    if (equipmentLoadedRef.current === currentWorkspaceId) return;
    if (equipmentPromiseRef.current) return equipmentPromiseRef.current;

    setIsLoadingEquipment(true);
    equipmentPromiseRef.current = fetchEquipment()
      .then((data) => {
        setEquipment(data);
        equipmentLoadedRef.current = currentWorkspaceId;
      })
      .finally(() => {
        equipmentPromiseRef.current = null;
        setIsLoadingEquipment(false);
      });

    return equipmentPromiseRef.current;
  }, [currentWorkspaceId]);

  // Force a full refetch even if equipment was already loaded for this
  // workspace. Used after booking mutations so the inventory list's
  // bookedBy / availability data picks up the change across every item
  // in the booking (a per-id sync would only refresh one piece).
  const refreshEquipment = useCallback(async () => {
    equipmentLoadedRef.current = null;
    return loadEquipment();
  }, [loadEquipment]);

  const loadBookings = useCallback(async () => {
    if (bookingsLoadedRef.current === currentWorkspaceId) return;
    if (bookingsPromiseRef.current) return bookingsPromiseRef.current;

    setIsLoadingBookings(true);
    bookingsPromiseRef.current = fetchBookings()
      .then((data) => {
        setBookings(data);
        bookingsLoadedRef.current = currentWorkspaceId;
      })
      .finally(() => {
        bookingsPromiseRef.current = null;
        setIsLoadingBookings(false);
      });

    return bookingsPromiseRef.current;
  }, [currentWorkspaceId]);

  const value = useMemo(
    () => ({
      state: { equipment, bookings, isLoadingEquipment, isLoadingBookings },
      actions: { loadEquipment, refreshEquipment, loadBookings, addEquipment, syncEquipment, removeEquipment, syncBooking, removeBooking, removeBookingItemsByEquipmentId },
    }),
    [equipment, bookings, isLoadingEquipment, isLoadingBookings, loadEquipment, refreshEquipment, loadBookings, addEquipment, syncEquipment, removeEquipment, syncBooking, removeBooking, removeBookingItemsByEquipmentId],
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
