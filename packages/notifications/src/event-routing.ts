// The messaging-model split: only "created" events post a new, templated
// announcement message. Every other event is a follow-up that edits (and,
// when loud, also replies to) the entity's already-sent original(s). See
// the shared Telegram contract for the full product decision — this file
// is just the vocabulary both the API dispatcher and the console settings
// UI use to tell the two kinds of event apart.

import type { NotificationEventKey } from "./events.js";

export const ANNOUNCEMENT_EVENT_KEYS = [
  "request.created",
  "booking.created",
  "venue_booking.created",
  "stream.created",
  "meeting.created",
] as const satisfies readonly NotificationEventKey[];

export type AnnouncementEventKey = (typeof ANNOUNCEMENT_EVENT_KEYS)[number];

export type FollowUpEventKey = Exclude<NotificationEventKey, AnnouncementEventKey>;

const ANNOUNCEMENT_KEY_SET = new Set<string>(ANNOUNCEMENT_EVENT_KEYS);

export function isAnnouncementEvent(key: string): key is AnnouncementEventKey {
  return ANNOUNCEMENT_KEY_SET.has(key);
}

export type NotificationEntityType = "request" | "booking" | "venue_booking" | "stream" | "meeting";

// One entity type per event "family" (the part before the dot), shared by
// every event key that belongs to it, announcement or follow-up alike.
const ENTITY_TYPE_BY_PREFIX: Record<string, NotificationEntityType> = {
  request: "request",
  booking: "booking",
  venue_booking: "venue_booking",
  stream: "stream",
  meeting: "meeting",
};

export function eventEntityType(key: NotificationEventKey): NotificationEntityType {
  const prefix = key.slice(0, key.indexOf("."));
  const entityType = ENTITY_TYPE_BY_PREFIX[prefix];
  if (!entityType) throw new Error(`Unknown notification entity prefix: ${prefix}`);
  return entityType;
}

// LOUD follow-ups also send a reply so people notice; every other
// follow-up (the default) only edits the original in place.
const LOUD_FOLLOW_UP_KEYS = new Set<FollowUpEventKey>([
  "request.requester_updated",
  "booking.requester_updated",
  "venue_booking.requester_updated",
  "stream.updated",
  "meeting.updated",
  "request.stale",
  "booking.stale",
]);

export function isLoudFollowUp(eventType: FollowUpEventKey): boolean {
  return LOUD_FOLLOW_UP_KEYS.has(eventType);
}
