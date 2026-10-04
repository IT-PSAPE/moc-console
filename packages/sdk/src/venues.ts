import type { Venue, VenueEvent } from "@moc/types/venues";
import type { MocTransport } from "./transport";

export type VenueDraft = Pick<Venue, "name" | "description">;
export type VenueEventDraft = Pick<VenueEvent, "name" | "description">;

export function createVenuesClient(transport: MocTransport) {
  return {
    list(workspaceId?: string): Promise<Venue[]> {
      return transport.call("venues", "list", undefined, workspaceId);
    },
    create(draft: VenueDraft, workspaceId?: string): Promise<Venue> {
      return transport.call("venues", "create", { draft }, workspaceId);
    },
    update(id: string, draft: VenueDraft, workspaceId?: string): Promise<Venue> {
      return transport.call("venues", "update", { id, draft }, workspaceId);
    },
    setActive(id: string, active: boolean, workspaceId?: string): Promise<void> {
      return transport.call("venues", "setActive", { id, active }, workspaceId);
    },
    delete(id: string, workspaceId?: string): Promise<void> {
      return transport.call("venues", "delete", { id }, workspaceId);
    },
    listEvents(workspaceId?: string): Promise<VenueEvent[]> {
      return transport.call("venues", "listEvents", undefined, workspaceId);
    },
    createEvent(draft: VenueEventDraft, workspaceId?: string): Promise<VenueEvent> {
      return transport.call("venues", "createEvent", { draft }, workspaceId);
    },
    updateEvent(id: string, draft: VenueEventDraft, workspaceId?: string): Promise<VenueEvent> {
      return transport.call("venues", "updateEvent", { id, draft }, workspaceId);
    },
    setEventActive(id: string, active: boolean, workspaceId?: string): Promise<void> {
      return transport.call("venues", "setEventActive", { id, active }, workspaceId);
    },
    deleteEvent(id: string, workspaceId?: string): Promise<void> {
      return transport.call("venues", "deleteEvent", { id }, workspaceId);
    },
  };
}

export type VenuesClient = ReturnType<typeof createVenuesClient>;
