import type { PublicVenue, PublicVenueEvent, VenueRecurrence } from "@moc/types/venues";
import type { MocTransport } from "./transport";

export type PublicRequestCategory = { value: string; label: string; description?: string | null };
export type PublicVenueAvailability = {
  venueId: string;
  venueName: string;
  slotStart: string;
  slotEnd: string;
  available: boolean;
  timeZone: string;
};

export type PublicRequestInput = {
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  dueDate: string | null;
  requestedBy: string;
  who: string;
  what: string;
  whenText: string;
  whereText: string;
  why: string;
  how: string;
  notes: string | null;
  flow: string | null;
};

export type PublicBookingInput = {
  title: string;
  equipmentIds: string[];
  bookedBy: string;
  checkedOutAt: string;
  expectedReturnAt: string;
  notes: string | null;
  requestedEquipment: string[];
  otherEquipment: string | null;
};

export type PublicVenueBookingInput = {
  venueId: string;
  requestedBy: string;
  slotStarts: string[];
  eventId: string | null;
  eventOther: string | null;
  recurrence: VenueRecurrence | null;
};

export type PublicSubmissionCreated = { id: string; trackingCode: string };
export type PublicBookingCreated = { bookingId: string; trackingCode: string; title: string };
export type PublicVenueBookingCreated = { id: string; trackingCode: string; title: string; startsAt: string; endsAt: string };

export class PublicSubmissionApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicSubmissionApiError";
    this.status = status;
  }
}

type TrackingResponse<T> = { submission: T };
type TrackingInput = Record<string, unknown>;
type TrackingError = { error?: unknown };

export function createPublicSubmissionsClient(transport: MocTransport) {
  function publicCall<T>(operation: string, workspaceId: string, input: Record<string, unknown> = {}): Promise<T> {
    return transport.call("publicSubmissions", operation, { ...input, workspaceId }, workspaceId);
  }

  return {
    listRequestCategories(workspaceId: string): Promise<PublicRequestCategory[]> {
      return publicCall("listRequestCategories", workspaceId);
    },
    listVenues(workspaceId: string): Promise<PublicVenue[]> {
      return publicCall("listVenues", workspaceId);
    },
    listVenueEvents(workspaceId: string): Promise<PublicVenueEvent[]> {
      return publicCall("listVenueEvents", workspaceId);
    },
    getVenueAvailability(workspaceId: string, venueId: string, date: string): Promise<PublicVenueAvailability[]> {
      return publicCall("getVenueAvailability", workspaceId, { venueId, date });
    },
    submitRequest(workspaceId: string, data: PublicRequestInput): Promise<PublicSubmissionCreated> {
      return publicCall("submitRequest", workspaceId, { data });
    },
    submitBooking(workspaceId: string, data: PublicBookingInput): Promise<PublicBookingCreated> {
      return publicCall("submitBooking", workspaceId, { data });
    },
    submitVenueBooking(workspaceId: string, data: PublicVenueBookingInput): Promise<PublicVenueBookingCreated> {
      return publicCall("submitVenueBooking", workspaceId, { data });
    },
    lookupTracking<T>(trackingCode: string): Promise<T | null> {
      return requestTracking<T>(transport, "POST", { trackingCode: trackingCode.trim().toUpperCase() }, true);
    },
    updateTracking<T>(input: TrackingInput): Promise<T> {
      return requestTracking<T>(transport, "PATCH", input, false).then((result) => result as T);
    },
    deleteTracking(input: TrackingInput): Promise<void> {
      return requestTracking<void>(transport, "DELETE", input, false).then(() => undefined);
    },
    notifyCreated(kind: "request" | "booking" | "venue-booking", id: string, trackingCode: string): void {
      const field = kind === "venue-booking" ? "venue_booking_id" : kind === "booking" ? "booking_id" : "request_id";
      void transport.request<void>(`/api/notify/${kind}`, {
        method: "POST",
        json: { [field]: id, tracking_code: trackingCode },
      }).catch(() => undefined);
    },
  };
}

async function requestTracking<T>(transport: MocTransport, method: "POST" | "PATCH" | "DELETE", input: TrackingInput, lookup: boolean): Promise<T | null> {
  const response = await transport.request<Response>("/api/public/submissions", { method, json: input, responseType: "response" });
  if (lookup && response.status === 404) return null;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof body === "object" && body !== null ? (body as TrackingError).error : null;
    throw new PublicSubmissionApiError(typeof error === "string" ? error : "The submission could not be updated.", response.status);
  }
  if (method === "DELETE") return null;
  const result = typeof body === "object" && body !== null ? body as TrackingResponse<T> : null;
  if (!result || !("submission" in result)) throw new PublicSubmissionApiError("The API returned an invalid response.", response.status);
  return result.submission;
}

export type PublicSubmissionsClient = ReturnType<typeof createPublicSubmissionsClient>;
