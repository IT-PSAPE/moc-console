import type { EquipmentCategory } from "./category.js";

export type BookingStatus = "booked" | "checked_out" | "returned" | "archived";

export type BookingItem = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  equipmentThumbnail: string | null;
};

export type Booking = {
  /** Explicit origin request; records may also exist independently. */
  requestId?: string | null;
  id: string;
  trackingCode: string;
  title: string;
  bookedBy: string;
  checkedOutDate: string;
  expectedReturnAt: string;
  returnedDate: string | null;
  duration: string;
  notes: string;
  status: BookingStatus;
  items: BookingItem[];
  createdAt: string;
};
