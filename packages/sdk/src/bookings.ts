import type { Booking, BookingStatus } from "@moc/types/equipment/booking";
import type { MocTransport } from "./transport";

export function createBookingsClient(transport: MocTransport) {
  return {
    list(workspaceId?: string): Promise<Booking[]> {
      return transport.call("bookings", "list", undefined, workspaceId);
    },
    getById(id: string, workspaceId?: string): Promise<Booking | null> {
      return transport.call("bookings", "getById", { id }, workspaceId);
    },
    listByEquipmentId(equipmentId: string, workspaceId?: string): Promise<Booking[]> {
      return transport.call("bookings", "listByEquipmentId", { equipmentId }, workspaceId);
    },
    update(booking: Booking, workspaceId?: string): Promise<Booking> {
      return transport.call("bookings", "update", { booking }, workspaceId);
    },
    updateStatus(id: string, status: BookingStatus, workspaceId?: string): Promise<void> {
      return transport.call("bookings", "updateStatus", { id, status }, workspaceId);
    },
    delete(id: string, workspaceId?: string): Promise<void> {
      return transport.call("bookings", "delete", { id }, workspaceId);
    },
  };
}

export type BookingsClient = ReturnType<typeof createBookingsClient>;
