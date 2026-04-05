import type { Equipment } from "@/types/equipment/equipment";
import type { Booking } from "@/types/equipment/booking";
import mockEquipment from "./mock/equipment.json";
import mockBookings from "./mock/bookings.json";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms));

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
  return mockBookings as Booking[];
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  await delay(100);
  return (mockBookings as Booking[]).filter((booking) => booking.equipmentId === equipmentId);
}
