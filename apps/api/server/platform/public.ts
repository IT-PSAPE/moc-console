import type { VenueRecurrence } from "@moc/types/venues";
import type { PlatformOperation } from "./context.js";
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js";

type WorkspaceInput = Record<string, unknown> & { workspaceId: string };

function workspaceInput(input: unknown, fields: readonly string[] = []): WorkspaceInput {
  const value = objectInput(input, ["workspaceId", ...fields]);
  return { ...value, workspaceId: uuidField(value, "workspaceId") };
}

function textOrNull(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new PlatformInputError(`Invalid ${key}`);
  return value;
}

function validIso(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new PlatformInputError(`Invalid ${field}`);
  return value;
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new PlatformInputError(`Invalid ${field}`);
  return value;
}

function recurrenceValue(value: unknown): VenueRecurrence | null {
  if (value === null) return null;
  const input = objectInput(value, ["custom", "frequency", "interval", "weekdays", "end"]);
  if (input.custom === false && input.end === null) return null;
  if (input.custom !== true || !["day", "week", "month"].includes(String(input.frequency))) throw new PlatformInputError("Invalid recurrence");
  if (!Number.isInteger(input.interval) || Number(input.interval) < 1 || Number(input.interval) > 365) throw new PlatformInputError("Invalid recurrence");
  const weekdays = input.weekdays;
  if (!Array.isArray(weekdays) || weekdays.some((day) => !Number.isInteger(day) || Number(day) < 1 || Number(day) > 7)) throw new PlatformInputError("Invalid recurrence");
  if (new Set(weekdays).size !== weekdays.length || (input.frequency === "week" && weekdays.length === 0)) throw new PlatformInputError("Invalid recurrence");
  const end = objectInput(input.end, ["type", "date", "count"]);
  if (end.type === "year_end") return { custom: true, frequency: input.frequency as VenueRecurrence["frequency"], interval: Number(input.interval), weekdays, end: { type: "year_end" } };
  if (end.type === "date" && validCalendarDate(end.date)) {
    return { custom: true, frequency: input.frequency as VenueRecurrence["frequency"], interval: Number(input.interval), weekdays, end: { type: "date", date: end.date } };
  }
  if (end.type === "count" && Number.isInteger(end.count) && Number(end.count) >= 2 && Number(end.count) <= 366) {
    return { custom: true, frequency: input.frequency as VenueRecurrence["frequency"], interval: Number(input.interval), weekdays, end: { type: "count", count: Number(end.count) } };
  }
  throw new PlatformInputError("Invalid recurrence");
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function jsonRecord(value: unknown, errorMessage: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(errorMessage);
  return value as Record<string, unknown>;
}

async function listRequestCategories(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const { workspaceId } = workspaceInput(raw);
  const result = await context.db.query<{ key: string; name: string; description: string | null }>(
    "SELECT key, name, description FROM public.public_list_request_categories($1::uuid)", [workspaceId],
  );
  return result.rows.map((row) => ({ value: row.key, label: row.name, description: row.description }));
}

async function listVenues(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const { workspaceId } = workspaceInput(raw);
  const result = await context.db.query<{ id: string; name: string; description: string | null }>(
    "SELECT id, name, description FROM public.public_list_venues($1::uuid)", [workspaceId],
  );
  return result.rows;
}

async function listVenueEvents(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const { workspaceId } = workspaceInput(raw);
  const result = await context.db.query<{ id: string; name: string; description: string | null }>(
    "SELECT id, name, description FROM public.public_list_venue_events($1::uuid)", [workspaceId],
  );
  return result.rows;
}

async function getVenueAvailability(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const input = workspaceInput(raw, ["venueId", "date"]);
  const venueId = uuidField(input, "venueId");
  const date = stringField(input, "date");
  if (!validCalendarDate(date)) throw new PlatformInputError("Invalid date");
  const result = await context.db.query(
    "SELECT venue_id AS \"venueId\", venue_name AS \"venueName\", slot_start AS \"slotStart\", slot_end AS \"slotEnd\", available, time_zone AS \"timeZone\" FROM public.public_venue_availability($1::uuid, $2::date, $3::uuid)",
    [input.workspaceId, date, venueId],
  );
  return result.rows;
}

async function submitRequest(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const input = workspaceInput(raw, ["data"]);
  const data = objectInput(input.data, ["title", "priority", "category", "dueDate", "requestedBy", "who", "what", "whenText", "whereText", "why", "how", "notes", "flow"]);
  const priority = stringField(data, "priority");
  if (!["low", "medium", "high", "urgent"].includes(priority)) throw new PlatformInputError("Invalid priority");
  const dueDate = data.dueDate === null ? null : validIso(data.dueDate, "dueDate");
  const result = await context.db.query<{ result: unknown }>(
    "SELECT public.public_submit_request($1::uuid, $2::text, $3::public.request_priority, $4::text, $5::timestamptz, $6::text, $7::text, $8::text, $9::text, $10::text, $11::text, $12::text, $13::text, $14::text) AS result",
    [input.workspaceId, stringField(data, "title"), priority, stringField(data, "category"), dueDate, stringField(data, "requestedBy"), stringField(data, "who"), stringField(data, "what"), stringField(data, "whenText"), stringField(data, "whereText"), stringField(data, "why"), stringField(data, "how"), textOrNull(data, "notes"), textOrNull(data, "flow")],
  );
  const row = jsonRecord(result.rows[0]?.result, "Request submission returned an invalid result");
  return { id: row.id, trackingCode: row.tracking_code };
}

async function submitBooking(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const input = workspaceInput(raw, ["data"]);
  const data = objectInput(input.data, ["title", "equipmentIds", "bookedBy", "checkedOutAt", "expectedReturnAt", "notes", "requestedEquipment", "otherEquipment"]);
  const equipmentIds = stringArray(data.equipmentIds, "equipmentIds");
  const checkedOutAt = validIso(data.checkedOutAt, "checkedOutAt");
  const expectedReturnAt = validIso(data.expectedReturnAt, "expectedReturnAt");
  const result = await context.db.query<{ result: unknown }>(
    "SELECT public.public_submit_booking_batch($1::uuid, $2::text, $3::uuid[], $4::text, $5::timestamptz, $6::timestamptz, $7::text, $8::text[], $9::text) AS result",
    [input.workspaceId, stringField(data, "title"), equipmentIds, stringField(data, "bookedBy"), checkedOutAt, expectedReturnAt, textOrNull(data, "notes"), stringArray(data.requestedEquipment, "requestedEquipment"), textOrNull(data, "otherEquipment")],
  );
  const row = jsonRecord(result.rows[0]?.result, "Booking submission returned an invalid result");
  return { bookingId: row.booking_id, trackingCode: row.tracking_code, title: row.title };
}

async function submitVenueBooking(context: Parameters<PlatformOperation["run"]>[0], raw: unknown): Promise<unknown> {
  const input = workspaceInput(raw, ["data"]);
  const data = objectInput(input.data, ["venueId", "requestedBy", "slotStarts", "eventId", "eventOther", "recurrence"]);
  const venueId = uuidField(data, "venueId");
  const eventId = data.eventId === null ? null : uuidField(data, "eventId");
  const slotStarts = stringArray(data.slotStarts, "slotStarts").map((slot) => validIso(slot, "slotStarts"));
  const result = await context.db.query<{ result: unknown }>(
    "SELECT public.public_submit_venue_booking($1::uuid, $2::uuid, $3::text, $4::timestamptz[], $5::uuid, $6::text, $7::text, $8::jsonb) AS result",
    [input.workspaceId, venueId, stringField(data, "requestedBy"), slotStarts, eventId, textOrNull(data, "eventOther"), null, JSON.stringify(recurrenceValue(data.recurrence ?? null))],
  );
  const row = jsonRecord(result.rows[0]?.result, "Venue booking submission returned an invalid result");
  return { id: row.id, trackingCode: row.tracking_code, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at };
}

export const operations: Record<string, PlatformOperation> = {
  listRequestCategories: { permission: "public", run: listRequestCategories },
  listVenues: { permission: "public", run: listVenues },
  listVenueEvents: { permission: "public", run: listVenueEvents },
  getVenueAvailability: { permission: "public", run: getVenueAvailability },
  submitRequest: { permission: "public", run: submitRequest },
  submitBooking: { permission: "public", run: submitBooking },
  submitVenueBooking: { permission: "public", run: submitVenueBooking },
};
