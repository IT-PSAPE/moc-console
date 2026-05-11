import { useEffect, useMemo } from "react";
import { LoadingSpinner, Spinner } from "@/components/feedback/spinner";
import type { Equipment } from "@/types/equipment";
import { useEquipment } from "./equipment-provider";
import { BookingCalendar } from "./booking-calendar";

export function InventoryCalendar({ equipment }: { equipment: Equipment[] }) {
  const {
    state: { bookings, isLoadingBookings },
    actions: { loadBookings },
  } = useEquipment();

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const item of equipment) map.set(item.id, item);
    return map;
  }, [equipment]);

  const visibleBookings = useMemo(() => {
    const ids = new Set(equipment.map((e) => e.id));
    return bookings.filter((b) => ids.has(b.equipmentId));
  }, [bookings, equipment]);

  if (isLoadingBookings) {
    return <LoadingSpinner className="py-16" />;
  }

  return (
    <BookingCalendar bookings={visibleBookings} equipmentMap={equipmentMap} />
  );
}
