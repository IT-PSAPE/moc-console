import { fetchEquipment, fetchBookings } from "@/data/fetch-equipment";
import type { Equipment } from "@/types/equipment/equipment";
import type { Booking } from "@/types/equipment/booking";
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
    loadBookings: () => Promise<void>;
    addEquipment: (equipment: Equipment) => void;
    syncEquipment: (equipment: Equipment) => void;
    removeEquipment: (id: string) => void;
  };
};

const EquipmentContext = createContext<EquipmentContextValue | null>(null);

export function EquipmentProvider({ children }: { children: ReactNode }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const equipmentLoadedRef = useRef(false);
  const equipmentPromiseRef = useRef<Promise<void> | null>(null);
  const bookingsLoadedRef = useRef(false);
  const bookingsPromiseRef = useRef<Promise<void> | null>(null);

  const addEquipment = useCallback((newItem: Equipment) => {
    setEquipment((prev) => [newItem, ...prev]);
  }, []);

  const syncEquipment = useCallback((updated: Equipment) => {
    setEquipment((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const removeEquipment = useCallback((id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const loadEquipment = useCallback(async () => {
    if (equipmentLoadedRef.current) return;
    if (equipmentPromiseRef.current) return equipmentPromiseRef.current;

    setIsLoadingEquipment(true);
    equipmentPromiseRef.current = fetchEquipment()
      .then((data) => {
        setEquipment(data);
        equipmentLoadedRef.current = true;
      })
      .finally(() => {
        equipmentPromiseRef.current = null;
        setIsLoadingEquipment(false);
      });

    return equipmentPromiseRef.current;
  }, []);

  const loadBookings = useCallback(async () => {
    if (bookingsLoadedRef.current) return;
    if (bookingsPromiseRef.current) return bookingsPromiseRef.current;

    setIsLoadingBookings(true);
    bookingsPromiseRef.current = fetchBookings()
      .then((data) => {
        setBookings(data);
        bookingsLoadedRef.current = true;
      })
      .finally(() => {
        bookingsPromiseRef.current = null;
        setIsLoadingBookings(false);
      });

    return bookingsPromiseRef.current;
  }, []);

  const value = useMemo(
    () => ({
      state: { equipment, bookings, isLoadingEquipment, isLoadingBookings },
      actions: { loadEquipment, loadBookings, addEquipment, syncEquipment, removeEquipment },
    }),
    [equipment, bookings, isLoadingEquipment, isLoadingBookings, loadEquipment, loadBookings, addEquipment, syncEquipment, removeEquipment],
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
