// Small local mirrors of packages/types/src/{requests,equipment}/constants.ts.
// apps/api cannot import @moc/types at runtime — it exports raw TypeScript a
// Vercel function cannot resolve (see server/streams/broadcast-reconciliation.ts
// for the same constraint) — so these stay in step by hand. The venue phase
// label lives in server/notifications/dispatch-tokens.ts already and is
// reused directly instead of being mirrored a third time.

import type { MiniAppStatusColor } from "@moc/notifications"

export type RequestStatusValue = "not_started" | "in_progress" | "completed" | "archived"
export type BookingStatusValue = "booked" | "checked_out" | "returned" | "archived"

const REQUEST_STATUS_LABEL: Record<RequestStatusValue, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
}

const REQUEST_STATUS_COLOR: Record<RequestStatusValue, MiniAppStatusColor> = {
  not_started: "gray",
  in_progress: "yellow",
  completed: "green",
  archived: "gray",
}

const BOOKING_STATUS_LABEL: Record<BookingStatusValue, string> = {
  booked: "Booked",
  checked_out: "Checked Out",
  returned: "Returned",
  archived: "Archived",
}

const BOOKING_STATUS_COLOR: Record<BookingStatusValue, MiniAppStatusColor> = {
  booked: "blue",
  checked_out: "yellow",
  returned: "green",
  archived: "gray",
}

const VENUE_PHASE_COLOR: Record<string, MiniAppStatusColor> = {
  booked: "blue",
  approved: "purple",
  in_progress: "yellow",
  completed: "green",
  rejected: "red",
  cancelled: "gray",
}

const EQUIPMENT_CATEGORY_LABEL: Record<string, string> = {
  camera: "Camera",
  lens: "Lens",
  lighting: "Lighting",
  audio: "Audio",
  support: "Support",
  monitor: "Monitor",
  cable: "Cable",
  accessory: "Accessory",
}

function fallbackLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABEL[status as RequestStatusValue] ?? fallbackLabel(status)
}

export function requestStatusColor(status: string): MiniAppStatusColor {
  return REQUEST_STATUS_COLOR[status as RequestStatusValue] ?? "gray"
}

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABEL[status as BookingStatusValue] ?? fallbackLabel(status)
}

export function bookingStatusColor(status: string): MiniAppStatusColor {
  return BOOKING_STATUS_COLOR[status as BookingStatusValue] ?? "gray"
}

export function venuePhaseColor(phase: string): MiniAppStatusColor {
  return VENUE_PHASE_COLOR[phase] ?? "gray"
}

export function equipmentCategoryLabel(category: string): string {
  return EQUIPMENT_CATEGORY_LABEL[category] ?? fallbackLabel(category)
}

export function titleCase(value: string): string {
  return fallbackLabel(value)
}
