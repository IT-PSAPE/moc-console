import type { EquipmentStatus } from "./status.js";
import type { EquipmentCategory } from "./category.js";

export type Equipment = {
  id: string;
  name: string;
  serialNumber: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  location: string;
  notes: string;
  lastActiveDate: string;
  bookedBy: string | null;
  thumbnail: string | null;
};
