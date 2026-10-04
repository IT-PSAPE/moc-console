import type { Equipment } from "@moc/types/equipment/equipment";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function createEquipment(equipment: Equipment): Promise<Equipment> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.equipment.create(equipment, workspaceId);
}

export async function updateEquipment(equipment: Equipment): Promise<Equipment> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.equipment.update(equipment, workspaceId);
}

export async function updateEquipmentStatus(id: string, status: Equipment["status"]): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.equipment.updateStatus(id, status, workspaceId);
}

export async function deleteEquipment(id: string): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  await moc.equipment.delete(id, workspaceId);
}
