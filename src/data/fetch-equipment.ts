import type { Equipment } from "@/types/equipment/equipment";
import type { Booking } from "@/types/equipment/booking";
import mockEquipment from "./mock/equipment.json";
import mockBookings from "./mock/bookings.json";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms));

type StoredBooking = Omit<Booking, "expectedReturnAt"> & { expectedReturnAt?: string };
const bookings = mockBookings as StoredBooking[];

function getExpectedReturnAt(booking: StoredBooking) {
  if (booking.expectedReturnAt) return booking.expectedReturnAt;
  const checkedOutAt = new Date(booking.checkedOutDate);
  const [, amountValue, unit] = booking.duration.match(/^(\d+)\s+(hour|hours|day|days)$/) ?? [];
  const amount = Number(amountValue);

  if (!Number.isNaN(amount) && unit) {
    const expectedAt = new Date(checkedOutAt);
    if (unit.startsWith("hour")) expectedAt.setHours(expectedAt.getHours() + amount);
    if (unit.startsWith("day")) expectedAt.setDate(expectedAt.getDate() + amount);
    return expectedAt.toISOString();
  }

  return checkedOutAt.toISOString();
}

function mapBooking(booking: StoredBooking): Booking {
  return {
    ...booking,
    expectedReturnAt: getExpectedReturnAt(booking),
  };
}

// ─── Fetch Functions ───────────────────────────────────

export async function fetchEquipment(): Promise<Equipment[]> {
  await delay(200);
  return mockEquipment as Equipment[];
}

export async function fetchEquipmentById(id: string): Promise<Equipment | undefined> {
  await delay(100);
  return (mockEquipment as Equipment[]).find((equipment) => equipment.id === id);
}

export async function fetchBookings(): Promise<Booking[]> {
  await delay(200);
  return bookings.map(mapBooking);
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  await delay(100);
  return bookings.filter((booking) => booking.equipmentId === equipmentId).map(mapBooking);
}
