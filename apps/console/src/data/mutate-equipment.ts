import type { Equipment } from "@moc/types/equipment/equipment";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

type EquipmentRow = {
  id: string;
  name: string;
  serial_number: string;
  category: Equipment["category"];
  status: Equipment["status"];
  location: string;
  notes: string | null;
  last_active_on: string | null;
  thumbnail_url: string | null;
};

function mapEquipmentRow(row: EquipmentRow, previous: Equipment): Equipment {
  return {
    id: row.id,
    name: row.name,
    serialNumber: row.serial_number,
    category: row.category,
    status: row.status,
    location: row.location,
    notes: row.notes ?? "",
    lastActiveDate: row.last_active_on ?? previous.lastActiveDate,
    bookedBy: previous.bookedBy,
    thumbnail: row.thumbnail_url,
  };
}

export async function createEquipment(equipment: Equipment): Promise<Equipment> {
  const workspaceId = await getCurrentWorkspaceId();
  const payload = {
    id: equipment.id,
    workspace_id: workspaceId,
    name: equipment.name,
    serial_number: equipment.serialNumber,
    category: equipment.category,
    status: equipment.status,
    location: equipment.location,
    notes: equipment.notes || null,
    last_active_on: equipment.lastActiveDate || null,
    thumbnail_url: equipment.thumbnail,
  };

  const { data, error } = await supabase
    .from("equipment")
    .insert(payload)
    .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEquipmentRow(data as EquipmentRow, equipment);
}

export async function updateEquipment(equipment: Equipment): Promise<Equipment> {
  const workspaceId = await getCurrentWorkspaceId();
  const payload = {
    id: equipment.id,
    workspace_id: workspaceId,
    name: equipment.name,
    serial_number: equipment.serialNumber,
    category: equipment.category,
    status: equipment.status,
    location: equipment.location,
    notes: equipment.notes || null,
    last_active_on: equipment.lastActiveDate || null,
    thumbnail_url: equipment.thumbnail,
  };

  const { data, error } = await supabase
    .from("equipment")
    .upsert(payload, { onConflict: "id" })
    .select("id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapEquipmentRow(data as EquipmentRow, equipment);
}

export async function updateEquipmentStatus(id: string, status: Equipment["status"]): Promise<void> {
  const { error } = await supabase
    .from("equipment")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
