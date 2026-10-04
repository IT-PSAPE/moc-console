import type { Equipment } from "@moc/types/equipment/equipment";
import type { MocTransport } from "./transport";

export type EquipmentDraft = Omit<Equipment, "bookedBy">;

export function createEquipmentClient(transport: MocTransport) {
  return {
    list(workspaceId?: string): Promise<Equipment[]> {
      return transport.call("equipment", "list", undefined, workspaceId);
    },
    getById(id: string, workspaceId?: string): Promise<Equipment | null> {
      return transport.call("equipment", "getById", { id }, workspaceId);
    },
    create(equipment: Equipment, workspaceId?: string): Promise<Equipment> {
      return transport.call("equipment", "create", { equipment }, workspaceId);
    },
    update(equipment: Equipment, workspaceId?: string): Promise<Equipment> {
      return transport.call("equipment", "update", { equipment }, workspaceId);
    },
    updateStatus(id: string, status: Equipment["status"], workspaceId?: string): Promise<void> {
      return transport.call("equipment", "updateStatus", { id, status }, workspaceId);
    },
    delete(id: string, workspaceId?: string): Promise<void> {
      return transport.call("equipment", "delete", { id }, workspaceId);
    },
  };
}

export type EquipmentClient = ReturnType<typeof createEquipmentClient>;
