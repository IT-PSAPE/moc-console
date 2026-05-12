import { useEffect, useMemo } from "react";
import { LoadingSpinner } from "@/components/feedback/spinner";
import type { Equipment } from "@/types/equipment";
import { useEquipment } from "./equipment-provider";
import { BookingCalendarView } from "./booking-calendar";

export function InventoryCalendarView({ equipment }: { equipment: Equipment[] }) {
  const {
    state: { bookings, isLoadingBookings },
    actions: { loadBookings },
  } = useEquipment();

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const visibleBookings = useMemo(() => {
    const ids = new Set(equipment.map((e) => e.id));
    return bookings.filter((b) => ids.has(b.equipmentId));
  }, [bookings, equipment]);

  if (isLoadingBookings) {
    return <LoadingSpinner className="py-6" />;
  }

  return <BookingCalendarView bookings={visibleBookings} />;
}
