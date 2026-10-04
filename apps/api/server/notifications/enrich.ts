// Server-side token enrichment. Given an entity id, read the full row
// from the shared PostgreSQL database
// and project it onto the composable token names declared in
// @moc/notifications' template token catalogs.
//
// Every function is best-effort: any failure or missing row returns {}
// so the caller falls back to the event payload — a DB hiccup must
// never silence a notification.

import { queryRows } from "@moc/backend/database";
import type { QueryResultRow } from "pg";
import { telegramStatusLabel, type TokenValues } from "@moc/notifications";

// Date tokens are emitted as raw ISO and localised at the render
// boundary (dispatch/assignment) once the workspace's timezone + format
// are known — see formatDateTokens in @moc/notifications.
function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}

export async function enrichRequest(requestId: string, options?: { throwOnError?: boolean }): Promise<TokenValues> {
  try {
    type RequestRow = QueryResultRow & {
      title: string; status: string; priority: string | null; category: string | null; requested_by: string | null;
      due_date: string | null; created_at: string; updated_at: string; tracking_code: string | null; who: string | null;
      what: string | null; when_text: string | null; where_text: string | null; why: string | null; how: string | null;
      notes: string | null; flow: string | null; category_name: string | null;
    };
    const [data] = await queryRows<RequestRow>(
      `SELECT request.title, request.status, request.priority, request.category, request.requested_by,
         request.due_date, request.created_at, request.updated_at, request.tracking_code, request.who,
         request.what, request.when_text, request.where_text, request.why, request.how, request.notes,
         request.flow, category.name AS category_name
       FROM public.requests AS request
       LEFT JOIN public.request_categories AS category
         ON category.workspace_id = request.workspace_id AND category.key = request.category
       WHERE request.id = $1 LIMIT 1`,
      [requestId],
    );
    if (!data) return {};
    return {
      title: data.title,
      status: telegramStatusLabel("request", data.status),
      priority: data.priority,
      category: data.category_name ?? data.category,
      requesterName: data.requested_by,
      requestedBy: data.requested_by,
      dueDate: fmtDate(data.due_date),
      createdAt: fmtDate(data.created_at),
      updatedAt: fmtDate(data.updated_at),
      trackingCode: data.tracking_code,
      who: data.who,
      what: data.what,
      whenText: data.when_text,
      whereText: data.where_text,
      why: data.why,
      how: data.how,
      notes: data.notes,
      flow: data.flow,
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    return {};
  }
}

export async function enrichChecklistItem(itemId: string, options?: { throwOnError?: boolean }): Promise<TokenValues> {
  try {
    type ChecklistRow = QueryResultRow & {
      label: string; checked: boolean; checklist_name: string; checklist_description: string | null;
      scheduled_at: string | null; section_name: string | null;
    };
    const [row] = await queryRows<ChecklistRow>(
      `SELECT item.label, item.checked, checklist.name AS checklist_name,
         checklist.description AS checklist_description, checklist.scheduled_at, section.name AS section_name
       FROM public.checklist_items AS item
       JOIN public.checklists AS checklist ON checklist.id = item.checklist_id
       LEFT JOIN public.checklist_sections AS section ON section.id = item.section_id
       WHERE item.id = $1 LIMIT 1`,
      [itemId],
    );
    if (!row) return {};

    return {
      title: row.label,
      checklistName: row.checklist_name,
      checklistDescription: row.checklist_description,
      checklistScheduledAt: fmtDate(row.scheduled_at),
      sectionName: row.section_name ?? "",
      itemChecked: yesNo(row.checked),
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    return {};
  }
}

type BookingRow = QueryResultRow & {
  booked_by: string;
  status: string;
  checked_out_at: string | null;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  tracking_code: string;
  equipment_name: string | null;
  equipment_category: string | null;
  equipment_location: string | null;
  equipment_serial_number: string | null;
  equipment_names: string[] | null;
};

// A tracking_code can cover a batch of bookings (non-unique by design),
// so aggregate: first row drives the scalar fields, all rows feed the
// equipment list + count.
export async function enrichBooking(
  trackingCode: string,
  workspaceId: string,
): Promise<TokenValues> {
  try {
    const rows = await queryRows<BookingRow>(
       `SELECT booking.booked_by, booking.status, booking.checked_out_at, booking.expected_return_at,
         booking.returned_at, booking.notes, booking.tracking_code, equipment.name AS equipment_name,
         equipment.category AS equipment_category, equipment.location AS equipment_location,
         equipment.serial_number AS equipment_serial_number, equipment.names AS equipment_names
       FROM public.bookings AS booking
       LEFT JOIN LATERAL (
         SELECT min(item.name) AS name, (array_agg(item.category::text ORDER BY item.name))[1] AS category,
           min(item.location) AS location,
           min(item.serial_number) AS serial_number,
           array_agg(item.name ORDER BY item.name) FILTER (WHERE item.name IS NOT NULL) AS names
         FROM public.booking_items AS booking_item
         JOIN public.equipment AS item ON item.id = booking_item.equipment_id
         WHERE booking_item.booking_id = booking.id
       ) AS equipment ON true
       WHERE booking.workspace_id = $1 AND booking.tracking_code = $2
       ORDER BY booking.created_at ASC`,
      [workspaceId, trackingCode],
    );
    if (rows.length === 0) return {};
    const first = rows[0];
    const names = rows.flatMap((row) => row.equipment_names ?? []);
    return {
      status: telegramStatusLabel("booking", first.status),
      requesterName: first.booked_by,
      bookedBy: first.booked_by,
      checkedOutAt: fmtDate(first.checked_out_at),
      expectedReturnAt: fmtDate(first.expected_return_at),
      returnedAt: fmtDate(first.returned_at),
      notes: first.notes,
      trackingCode: first.tracking_code,
      itemCount: String(rows.length),
      equipmentName: first.equipment_name ?? "",
      equipmentNames: names.join(", "),
      equipmentCategory: first.equipment_category ?? "",
      equipmentLocation: first.equipment_location ?? "",
      equipmentSerial: first.equipment_serial_number ?? "",
    };
  } catch {
    return {};
  }
}

export async function enrichStream(streamId: string): Promise<TokenValues> {
  try {
    type StreamRow = QueryResultRow & {
      title: string; description: string | null; scheduled_start_time: string | null; actual_start_time: string | null;
      stream_status: string | null; privacy_status: string | null; is_for_kids: boolean | null;
      latency_preference: string | null; tags: string[] | null; created_at: string; stream_url: string | null;
    };
    const [data] = await queryRows<StreamRow>(
      `SELECT title, description, scheduled_start_time, actual_start_time, stream_status, privacy_status,
         is_for_kids, latency_preference, tags, created_at, stream_url
       FROM public.streams WHERE id = $1 LIMIT 1`,
      [streamId],
    );
    if (!data) return {};
    return {
      title: data.title,
      description: data.description,
      scheduledStartTime: fmtDate(data.scheduled_start_time),
      actualStartTime: fmtDate(data.actual_start_time),
      status: data.stream_status,
      privacyStatus: data.privacy_status,
      isForKids: yesNo(data.is_for_kids),
      latencyPreference: data.latency_preference,
      tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
      createdAt: fmtDate(data.created_at),
      streamUrl: data.stream_url,
    };
  } catch {
    return {};
  }
}

type VenueBookingRow = QueryResultRow & {
  title: string;
  requested_by: string;
  tracking_code: string;
  event_other: string | null;
  notes: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  cancel_reason: string | null;
  cancelled_at: string | null;
  recurrence: unknown;
  venue_booking_slots: Array<{ occurrence_index: number; slot_start: string; slot_end: string }>;
  venue_name: string | null;
  venue_description: string | null;
  event_name: string | null;
};

function venueRecurrenceSummary(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const recurrence = value as Record<string, unknown>;
  const interval = Number(recurrence.interval);
  const frequency = typeof recurrence.frequency === "string" ? recurrence.frequency : "";
  const end = recurrence.end && typeof recurrence.end === "object" && !Array.isArray(recurrence.end) ? recurrence.end as Record<string, unknown> : null;
  if (!Number.isInteger(interval) || interval < 1 || !["day", "week", "month"].includes(frequency) || !end) return undefined;
  const unit = interval === 1 ? frequency : `${frequency}s`;
  const base = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}`;
  if (end.type === "count") return `${base}, ${String(end.count)} times`;
  if (end.type === "date") return `${base} until ${String(end.date)}`;
  return `${base} until the end of the year`;
}

type VenueBookingSlotWindow = { occurrence_index: number; slot_start: string; slot_end: string };

// Mirrors packages/types/src/venues/phase.ts's deriveVenueBookingSeriesPhase:
// cancelled/rejected are decisions that win outright, then the clock against
// the concrete occurrences, then the approval decision, then "booked".
export function deriveVenueBookingSeriesStatus(
  status: string,
  slots: VenueBookingSlotWindow[],
  startsAt: string,
  endsAt: string,
  at: Date = new Date(),
): string {
  if (status === "cancelled" || status === "rejected") return status;
  const occurrences = new Map<number, { startsAt: number; endsAt: number }>();
  for (const slot of slots) {
    const start = new Date(slot.slot_start).getTime();
    const end = new Date(slot.slot_end).getTime();
    const current = occurrences.get(slot.occurrence_index);
    occurrences.set(slot.occurrence_index, { startsAt: Math.min(current?.startsAt ?? start, start), endsAt: Math.max(current?.endsAt ?? end, end) });
  }
  const now = at.getTime();
  if (occurrences.size === 0) {
    if (now >= new Date(endsAt).getTime()) return "completed";
    if (now >= new Date(startsAt).getTime()) return "in_progress";
    return status === "approved" ? "approved" : "booked";
  }
  if ([...occurrences.values()].some((occurrence) => occurrence.startsAt <= now && now < occurrence.endsAt)) return "in_progress";
  const lastEnd = Math.max(...[...occurrences.values()].map((occurrence) => occurrence.endsAt));
  if (now >= lastEnd) return "completed";
  return status === "approved" ? "approved" : "booked";
}

// Looked up by id (venue_bookings.id === notification_outbox.entity_id),
// the same identifier enrichRequest uses. Series status is derived from the
// concrete occurrences so gaps between repeat dates remain "booked".
export async function enrichVenueBooking(venueBookingId: string, options?: { throwOnError?: boolean }): Promise<TokenValues> {
  try {
    const [data] = await queryRows<VenueBookingRow>(
      `SELECT booking.title, booking.requested_by, booking.tracking_code, booking.event_other, booking.notes,
         booking.status, booking.starts_at, booking.ends_at, booking.recurrence, booking.cancel_reason,
         booking.cancelled_at, venue.name AS venue_name, venue.description AS venue_description,
         event.name AS event_name,
         coalesce(slots.rows, '[]'::jsonb) AS venue_booking_slots
       FROM public.venue_bookings AS booking
       LEFT JOIN public.venues AS venue ON venue.id = booking.venue_id
       LEFT JOIN public.venue_events AS event ON event.id = booking.event_id
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object('occurrence_index', slot.occurrence_index,
           'slot_start', slot.slot_start, 'slot_end', slot.slot_end)
           ORDER BY slot.occurrence_index, slot.slot_start) AS rows
         FROM public.venue_booking_slots AS slot WHERE slot.venue_booking_id = booking.id
       ) AS slots ON true
       WHERE booking.id = $1 LIMIT 1`,
      [venueBookingId],
    );
    if (!data) return {};
    const row = data;
    const occurrenceCount = new Set(row.venue_booking_slots.map((slot) => slot.occurrence_index)).size;
    const repeatPattern = venueRecurrenceSummary(row.recurrence);
    return {
      title: row.title,
      requesterName: row.requested_by,
      trackingCode: row.tracking_code,
      venueName: row.venue_name ?? undefined,
      venueDescription: row.venue_description ?? undefined,
      // A booking either points at a workspace event or carries the
      // submitter's own "Other" description. Both answer "what is this for",
      // so one token reports whichever is set.
      eventName: row.event_name ?? row.event_other ?? undefined,
      startsAt: fmtDate(row.starts_at),
      endsAt: fmtDate(row.ends_at),
      notes: row.notes,
      cancelReason: row.cancel_reason,
      cancelledAt: fmtDate(row.cancelled_at),
      status: deriveVenueBookingSeriesStatus(row.status, row.venue_booking_slots, row.starts_at, row.ends_at),
      // The raw stored value ('auto'|'approved'|'rejected'|'cancelled'), as
      // opposed to `status` above (the reader-facing derived phase). Inline
      // action keyboards key off this, never off the phase.
      storedStatus: row.status,
      repeatPattern,
      occurrenceCount: row.recurrence ? String(occurrenceCount) : undefined,
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    return {};
  }
}

export async function enrichMeeting(meetingId: string): Promise<TokenValues> {
  try {
    type MeetingRow = QueryResultRow & {
      topic: string; description: string | null; start_time: string | null; duration: number | null;
      timezone: string | null; meeting_type: string | null; waiting_room: boolean | null;
      recurrence_type: string | null; created_at: string; join_url: string | null;
    };
    const [data] = await queryRows<MeetingRow>(
      `SELECT topic, description, start_time, duration, timezone, meeting_type, waiting_room,
         recurrence_type, created_at, join_url FROM public.zoom_meetings WHERE id = $1 LIMIT 1`,
      [meetingId],
    );
    if (!data) return {};
    return {
      topic: data.topic,
      description: data.description,
      startTime: fmtDate(data.start_time),
      duration: data.duration != null ? `${data.duration} min` : "",
      timezone: data.timezone,
      meetingType: data.meeting_type,
      waitingRoom: yesNo(data.waiting_room),
      recurrenceType: data.recurrence_type,
      createdAt: fmtDate(data.created_at),
      joinUrl: data.join_url,
    };
  } catch {
    return {};
  }
}
