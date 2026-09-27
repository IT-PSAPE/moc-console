// Server-side token enrichment. Given an entity id, read the full row
// from the shared Supabase DB (service-role admin client, bypasses RLS)
// and project it onto the composable token names declared in
// notification-templates-core's category catalogs.
//
// Every function is best-effort: any failure or missing row returns {}
// so the caller falls back to the event payload — a DB hiccup must
// never silence a notification.

import { getSupabaseAdmin } from "../supabase-admin.js";
import type { TokenValues } from "@moc/notifications";

// Date tokens are emitted as raw ISO and localised at the render
// boundary (dispatch/assignment) once the workspace's timezone + format
// are known — see formatDateTokens in notification-templates-core.
function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes" : "No";
}

function relatedName(value: { name: unknown } | { name: unknown }[] | null): string | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return typeof relation?.name === "string" ? relation.name : null;
}

export async function enrichRequest(requestId: string, options?: { throwOnError?: boolean }): Promise<TokenValues> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("requests")
      .select(
        "title, status, priority, category, requested_by, due_date, created_at, updated_at, tracking_code, who, what, when_text, where_text, why, how, notes, flow, request_categories!requests_workspace_category_fkey(name)",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (error) throw new Error("Request enrichment failed");
    if (!data) return {};
    return {
      title: data.title,
      status: data.status,
      priority: data.priority,
      category: relatedName(data.request_categories) ?? data.category,
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
    const admin = getSupabaseAdmin();
    const { data: item, error: itemError } = await admin
      .from("checklist_items")
      .select("label, checked, checklist_id, section_id")
      .eq("id", itemId)
      .maybeSingle();
    if (itemError) throw new Error("Checklist item enrichment failed");
    if (!item) return {};

    const { data: checklist, error: checklistError } = await admin
      .from("checklists")
      .select("name, description, scheduled_at")
      .eq("id", item.checklist_id)
      .maybeSingle();
    if (checklistError) throw new Error("Checklist enrichment failed");
    if (!checklist) return {};

    let sectionName = "";
    if (item.section_id) {
      const { data: section, error: sectionError } = await admin
        .from("checklist_sections")
        .select("name")
        .eq("id", item.section_id)
        .maybeSingle();
      if (sectionError) throw new Error("Checklist section enrichment failed");
      sectionName = section?.name ?? "";
    }

    return {
      title: item.label,
      checklistName: checklist.name,
      checklistDescription: checklist.description,
      checklistScheduledAt: fmtDate(checklist.scheduled_at),
      sectionName,
      itemChecked: yesNo(item.checked),
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    return {};
  }
}

type BookingRow = {
  booked_by: string;
  status: string;
  checked_out_at: string | null;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  tracking_code: string;
  equipment: { name: string; category: string; location: string; serial_number: string } | null;
};

// A tracking_code can cover a batch of bookings (non-unique by design),
// so aggregate: first row drives the scalar fields, all rows feed the
// equipment list + count.
export async function enrichBooking(
  trackingCode: string,
  workspaceId: string,
): Promise<TokenValues> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("bookings")
      .select(
        "booked_by, status, checked_out_at, expected_return_at, returned_at, notes, tracking_code, equipment:equipment_id(name, category, location, serial_number)",
      )
      .eq("workspace_id", workspaceId)
      .eq("tracking_code", trackingCode);
    const rows = (data ?? []) as unknown as BookingRow[];
    if (rows.length === 0) return {};
    const first = rows[0];
    const names = rows.map((r) => r.equipment?.name).filter(Boolean) as string[];
    return {
      status: first.status,
      requesterName: first.booked_by,
      bookedBy: first.booked_by,
      checkedOutAt: fmtDate(first.checked_out_at),
      expectedReturnAt: fmtDate(first.expected_return_at),
      returnedAt: fmtDate(first.returned_at),
      notes: first.notes,
      trackingCode: first.tracking_code,
      itemCount: String(rows.length),
      equipmentName: first.equipment?.name ?? "",
      equipmentNames: names.join(", "),
      equipmentCategory: first.equipment?.category ?? "",
      equipmentLocation: first.equipment?.location ?? "",
      equipmentSerial: first.equipment?.serial_number ?? "",
    };
  } catch {
    return {};
  }
}

export async function enrichStream(streamId: string): Promise<TokenValues> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("streams")
      .select(
        "title, description, scheduled_start_time, actual_start_time, stream_status, privacy_status, is_for_kids, latency_preference, tags, created_at, stream_url",
      )
      .eq("id", streamId)
      .maybeSingle();
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

type VenueBookingRelation<T> = T | T[] | null;

type VenueBookingRow = {
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
  venues: VenueBookingRelation<{ name: string; location: string | null }>;
  venue_events: VenueBookingRelation<{ name: string }>;
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

export function deriveVenueBookingSeriesStatus(
  status: string,
  slots: VenueBookingSlotWindow[],
  startsAt: string,
  endsAt: string,
  at: Date = new Date(),
): string {
  if (status === "cancelled") return "cancelled";
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
    return "booked";
  }
  if ([...occurrences.values()].some((occurrence) => occurrence.startsAt <= now && now < occurrence.endsAt)) return "in_progress";
  const lastEnd = Math.max(...[...occurrences.values()].map((occurrence) => occurrence.endsAt));
  return now >= lastEnd ? "completed" : "booked";
}

// PostgREST returns an embedded row as an object or, for some relationship
// shapes, a one-element array. Both mean the same single related row.
function firstRelated<T>(relation: VenueBookingRelation<T>): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

// Looked up by id (venue_bookings.id === notification_outbox.entity_id),
// the same identifier enrichRequest uses. Series status is derived from the
// concrete occurrences so gaps between repeat dates remain "booked".
export async function enrichVenueBooking(venueBookingId: string, options?: { throwOnError?: boolean }): Promise<TokenValues> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("venue_bookings")
      .select(
        "title, requested_by, tracking_code, event_other, notes, status, starts_at, ends_at, recurrence, cancel_reason, cancelled_at, venue_booking_slots(occurrence_index, slot_start, slot_end), venues:venue_id(name, location), venue_events:event_id(name)",
      )
      .eq("id", venueBookingId)
      .maybeSingle();
    if (error) throw new Error("Venue booking enrichment failed");
    if (!data) return {};
    const row = data as unknown as VenueBookingRow;
    const venue = firstRelated(row.venues);
    const event = firstRelated(row.venue_events);
    const occurrenceCount = new Set(row.venue_booking_slots.map((slot) => slot.occurrence_index)).size;
    const repeatPattern = venueRecurrenceSummary(row.recurrence);
    return {
      title: row.title,
      requesterName: row.requested_by,
      trackingCode: row.tracking_code,
      venueName: venue?.name,
      venueLocation: venue?.location,
      // A booking either points at a workspace event or carries the
      // submitter's own "Other" description. Both answer "what is this for",
      // so one token reports whichever is set.
      eventName: event?.name ?? row.event_other ?? undefined,
      startsAt: fmtDate(row.starts_at),
      endsAt: fmtDate(row.ends_at),
      notes: row.notes,
      cancelReason: row.cancel_reason,
      cancelledAt: fmtDate(row.cancelled_at),
      status: deriveVenueBookingSeriesStatus(row.status, row.venue_booking_slots, row.starts_at, row.ends_at),
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
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("zoom_meetings")
      .select(
        "topic, description, start_time, duration, timezone, meeting_type, waiting_room, recurrence_type, created_at, join_url",
      )
      .eq("id", meetingId)
      .maybeSingle();
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
