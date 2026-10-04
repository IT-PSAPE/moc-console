import type { Equipment } from "@moc/types/equipment/equipment";
import type { Booking } from "@moc/types/equipment/booking";
import { moc } from "@/lib/moc-client";
import { getCurrentWorkspaceId } from "./current-workspace";

export async function fetchEquipment(workspaceId?: string): Promise<Equipment[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.equipment.list(resolvedWorkspaceId);
}

export async function fetchEquipmentById(id: string, workspaceId?: string): Promise<Equipment | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return (await moc.equipment.getById(id, resolvedWorkspaceId)) ?? undefined;
}

export async function fetchBookings(workspaceId?: string): Promise<Booking[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return moc.bookings.list(resolvedWorkspaceId);
}

export async function fetchBookingById(id: string, workspaceId?: string): Promise<Booking | undefined> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  return (await moc.bookings.getById(id, resolvedWorkspaceId)) ?? undefined;
}

export async function fetchBookingsByEquipmentId(equipmentId: string): Promise<Booking[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return moc.bookings.listByEquipmentId(equipmentId, workspaceId);
}
