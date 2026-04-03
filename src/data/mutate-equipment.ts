import type { Equipment } from "@/types/equipment/equipment";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mock update — returns the equipment as-is (no real persistence yet) */
export async function updateEquipment(equipment: Equipment): Promise<Equipment> {
  await delay(300);
  return equipment;
}

/** Mock delete — resolves after delay (no real persistence yet) */
export async function deleteEquipment(id: string): Promise<void> {
  void id;
  await delay(300);
}
