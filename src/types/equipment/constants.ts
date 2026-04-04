import type { EquipmentStatus } from "./status";
import type { EquipmentCategory } from "./category";
import type { BookingStatus } from "./booking";

// ─── Labels ────────────────────────────────────────────

export const equipmentStatusLabel: Record<EquipmentStatus, string> = {
  available: "Available",
  booked: "Booked",
  booked_out: "Booked Out",
  maintenance: "Maintenance",
};

export const equipmentCategoryLabel: Record<EquipmentCategory, string> = {
  camera: "Camera",
  lens: "Lens",
  lighting: "Lighting",
  audio: "Audio",
  support: "Support",
  monitor: "Monitor",
  cable: "Cable",
  accessory: "Accessory",
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  booked: "Booked",
  checked_out: "Checked Out",
  returned: "Returned",
};

// ─── Colors ────────────────────────────────────────────

export const equipmentStatusColor: Record<EquipmentStatus, "green" | "yellow" | "blue" | "red"> = {
  available: "green",
  booked: "blue",
  booked_out: "yellow",
  maintenance: "red",
};

export const equipmentCategoryColor: Record<EquipmentCategory, "blue" | "purple" | "yellow" | "green" | "gray"> = {
  camera: "blue",
  lens: "purple",
  lighting: "yellow",
  audio: "green",
  support: "gray",
  monitor: "blue",
  cable: "gray",
  accessory: "purple",
};

export const bookingStatusColor: Record<BookingStatus, "blue" | "yellow" | "green"> = {
  booked: "blue",
  checked_out: "yellow",
  returned: "green",
};
