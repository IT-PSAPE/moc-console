import type { VenueBooking } from "@moc/types/venues";
import type { MocTransport } from "./transport";

export function createVenueBookingsClient(transport: MocTransport) {
  return {
    list(workspaceId?: string): Promise<VenueBooking[]> {
      return transport.call("venueBookings", "list", undefined, workspaceId);
    },
    getById(id: string, workspaceId?: string): Promise<VenueBooking | null> {
      return transport.call("venueBookings", "getById", { id }, workspaceId);
    },
    cancel(id: string, reason: string, workspaceId?: string): Promise<VenueBooking> {
      return transport.call("venueBookings", "cancel", { id, reason }, workspaceId);
    },
    restore(id: string, workspaceId?: string): Promise<VenueBooking> {
      return transport.call("venueBookings", "restore", { id }, workspaceId);
    },
    approve(id: string, workspaceId?: string): Promise<VenueBooking> {
      return transport.call("venueBookings", "approve", { id }, workspaceId);
    },
    reject(id: string, workspaceId?: string): Promise<VenueBooking> {
      return transport.call("venueBookings", "reject", { id }, workspaceId);
    },
  };
}

export type VenueBookingsClient = ReturnType<typeof createVenueBookingsClient>;
