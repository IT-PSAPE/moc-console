# Booking is the batch, not the per-equipment row

`public.bookings` originally stored one row per piece of reserved **Equipment**: each row carried its own `status`, `returned_at`, `bookedBy`, dates, and notes, with batch identity carried only by a shared `tracking_code`. The word "Booking" in the codebase meant "this equipment, on these dates, by this person" — but the word everywhere in the product (the request app's confirmation, the notification template, the user's mental model) meant the *submission*: one person, one date range, one tracking code, 1+ equipment items. We are splitting the schema so the **Booking** *is* the submission (one row, one tracking code, one title, one lifecycle) and a new `booking_items` table is the pure join to **Equipment**.

## Decision

- **Booking is the batch.** `bookings` carries `id, workspace_id, tracking_code, title, booked_by, checked_out_at, expected_return_at, returned_at, notes, status, created_at`. One row per submission; `tracking_code` is no longer duplicated.
- **Booking item is a pure join.** `booking_items` carries `id, booking_id, equipment_id` only — no lifecycle of its own.
- **One-shot return.** `status` and `returned_at` live on the header because, per domain owner, returns happen as one unit — a Booking is checked out and returned all-or-nothing. Items are never returned individually.
- **Title is user-supplied and required.** Captured top-of-step-1 in MOC Request, surfaced as the booking's identity in the console list and in the requester's tracking lookup. **Read-only in the console UI** — admins do not rename submissions.
- **MOC Console does not create Bookings.** The dead `CreateBookingModal` is deleted; bookings originate exclusively from MOC Request. The same invariant already holds for Requests.
- **Data migration is one-pass.** Legacy `bookings` is renamed to `bookings_old`; one new `bookings` header is inserted per distinct `tracking_code` (title backfilled as `'Booking ' || tracking_code`); each legacy row becomes a `booking_items` row. Status is reconciled to the header by the rule: any `checked_out` ⇒ `checked_out`; else all `returned` ⇒ `returned`; else `booked`. `returned_at = MAX(legacy.returned_at)`, null if any item is un-returned.
- **`public_browse_equipment` availability check** updates to join `equipment` → `booking_items` → `bookings` (status/dates now live one hop away).

## Status

Accepted (2026-05-27). Adds the **Booking** and **Booking item** entries to CONTEXT.md and resolves the flagged "Booking overloaded" ambiguity recorded the same day.

## Considered options

- **Keep the schema; group by `tracking_code` in the UI only.** Cheap to implement (no migration, no new table). Rejected: the model stays incoherent — `tracking_code` becomes a de-facto entity ID without being one, batch-shared fields stay duplicated across N rows (drift risk), and there is no honest place for `title` to live. CONTEXT.md could not call a batch the unit without lying about the schema.
- **Per-item `status` / `returned_at`.** Lets a partial return ("the camera came back, the tripods are still out") be modelled exactly. Rejected after the domain owner confirmed returns are batch-shaped in practice: every item is returned together. Per-item lifecycle would force a synthetic batch-level rollup status for the list view, more drawer UI surface, and reconciliation rules ("what status should the header show if items disagree?") that have no real answer. YAGNI.
- **Per-item dates / notes.** Would allow staggered windows per piece of equipment. Rejected for the same reason as per-item status — never asked for, never how submissions are made, and the submit form has one date range and one notes field for all selected equipment.
- **Admin parity: add multi-equipment to a console "Create Booking" modal.** Rejected (and stronger: console gets *no* booking-creation capability). Console manages submissions; MOC Request creates them. Mixing creation paths blurs the two apps' responsibilities and creates two places that must stay in sync.
- **Editable title in the console drawer.** Rejected by the domain owner: the title is the requester's identifier for their own submission; admins act on what was submitted, they don't relabel it.

## Consequences

- CONTEXT.md gains **Booking** and **Booking item** entries; the **Authenticated flow** entry now explicitly states the console doesn't author submissions.
- The console booking list, table, calendar, drawer, filters, and the `Booking` type in `@moc/types` all rebuild around the batch — cards show title + items count, the drawer shows an `Items (N)` section below batch fields, sort-by-equipment-name is replaced with sort-by-title, search adds `title`.
- The notification template's booking line changes from `Booking ${trackingCode} (${itemCount} items)` to `${title} — ${itemCount} item(s)`.
- `public_submit_booking_batch` now writes one header + N items (one transaction, same anonymous RPC surface). `public_lookup_tracking` reads from the new shape.
- A future need to support partial returns or per-item annotations would require schema changes here — the lifecycle fields would move to `booking_items` and the header would gain a derived/rollup status. Acceptable trade given current product reality.
- `bookings_old` is dropped only after the migration is verified in the relevant environment, so we can roll back the data move if anything goes wrong in the first hours.
- **Equipment deletion cascades through `booking_items` only.** When a piece of equipment is deleted, its row in `booking_items` is removed but the parent **Booking** survives — even if that leaves a zero-item booking. This is intentional: the booking row is an audit trail of "this submission existed" and shouldn't vanish because a single piece of gear was retired afterwards. UI must therefore handle zero-item bookings gracefully (`N items` becomes `0 items`; the drawer's items section shows an empty state).
- **The user-supplied title surfaces in three places on the requester side:** the tracking-lookup heading (per the ADR's main body), the booking review step, and the post-submit confirmation screen. The confirmation screen carries `title` alongside `trackingCode` in the navigation state.
