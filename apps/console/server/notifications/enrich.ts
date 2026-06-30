// Server-side token enrichment. Given an entity id, read the full row
// from the shared Supabase DB (service-role admin client, bypasses RLS)
// and project it onto the composable token names declared in
// notification-templates-core's category catalogs.
//
// Every function is best-effort: any failure or missing row returns {}
// so the caller falls back to the event payload — a DB hiccup must
// never silence a notification.

import { getSupabaseAdmin } from "../supabase-admin.js";
import type { TokenValues } from "../../src/data/notification-templates-core.js";

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

// cue start/duration are integer seconds — render as H:MM:SS / M:SS.
function clock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export async function enrichRequest(requestId: string): Promise<TokenValues> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("requests")
      .select(
        "title, status, priority, category, requested_by, due_date, created_at, updated_at, tracking_code, who, what, when_text, where_text, why, how, notes, flow",
      )
      .eq("id", requestId)
      .maybeSingle();
    if (!data) return {};
    return {
      title: data.title,
      status: data.status,
      priority: data.priority,
      category: data.category,
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
  } catch {
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

// Cue assignment enrichment. Returns the cue/track/event token values
// plus `eventId` so the caller can build the link URL. `title` is the
// cue label (the assignment's subject).
export async function enrichCue(
  cueId: string,
): Promise<(TokenValues & { eventId?: string }) | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data: cue } = await admin
      .from("cues")
      .select("label, start, duration, type, notes, track_id")
      .eq("id", cueId)
      .maybeSingle();
    if (!cue) return null;

    const { data: track } = await admin
      .from("tracks")
      .select("name, event_id")
      .eq("id", cue.track_id)
      .maybeSingle();
    if (!track) return null;

    const { data: event } = await admin
      .from("events")
      .select("id, title, description, scheduled_at, duration")
      .eq("id", track.event_id)
      .maybeSingle();
    if (!event) return null;

    return {
      eventId: event.id,
      title: cue.label,
      eventName: event.title,
      eventDescription: event.description,
      eventScheduledAt: fmtDate(event.scheduled_at),
      eventDuration: event.duration != null ? `${event.duration} min` : "",
      trackName: track.name,
      cueStart: clock(cue.start),
      cueDuration: clock(cue.duration),
      cueType: cue.type,
      cueNotes: cue.notes,
    };
  } catch {
    return null;
  }
}

export async function enrichChecklistItem(
  itemId: string,
): Promise<(TokenValues & { checklistId?: string }) | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data: item } = await admin
      .from("checklist_items")
      .select("label, checked, checklist_id, section_id")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return null;

    const { data: checklist } = await admin
      .from("checklists")
      .select("id, name, description, scheduled_at")
      .eq("id", item.checklist_id)
      .maybeSingle();
    if (!checklist) return null;

    let sectionName = "";
    if (item.section_id) {
      const { data: section } = await admin
        .from("checklist_sections")
        .select("name")
        .eq("id", item.section_id)
        .maybeSingle();
      sectionName = section?.name ?? "";
    }

    return {
      checklistId: checklist.id,
      title: item.label,
      checklistName: checklist.name,
      checklistDescription: checklist.description,
      checklistScheduledAt: fmtDate(checklist.scheduled_at),
      sectionName,
      itemChecked: yesNo(item.checked),
    };
  } catch {
    return null;
  }
}
