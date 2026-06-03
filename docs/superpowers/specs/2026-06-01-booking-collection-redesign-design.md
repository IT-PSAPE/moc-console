# Booking collection redesign — booking-level collection, transient scan ticks

**Date:** 2026-06-01
**Status:** Approved
**Branch:** `fix/booking-collection-redesign`

## Background

Commit `22acb12` ("feat(bookings): add QR collection flow") introduced per-item
collection: scanning a QR stamped `booking_items.collected_at`, and the shared
`BOOKING_SELECT` query was changed to read that column. The column was only ever
added via a manual SQL patch (`docs/phases/patches/2026-05-31-booking-item-collected-at.sql`)
that was never applied to the live database. Because `BOOKING_SELECT` is shared
by every booking read, the missing column made all booking queries fail with
`42703 column booking_items.collected_at does not exist`, so **no bookings were
visible in the console at all.**

This redesign removes per-item collection entirely and moves the notion of
"collected" up to the booking level, which also makes that bug disappear with no
database migration.

## Goals

1. Scanning a QR **ticks items in local React state only** — transient,
   per-session, never persisted, not part of the `Booking`/`BookingItem` type.
2. "Collected" is a **booking-level** concept carried by `status` +
   `checked_out_at`. There is no per-item collected state.
3. Remove `booking_items.collected_at` (column, type field, all reads/writes).

## Decisions (from brainstorming)

- **Where the collected timestamp lives:** reuse the existing
  `bookings.checked_out_at` (no new column). It is `NOT NULL` and already
  populated at creation, so "collected vs not" is carried by `status`.
- **What Save does:** when `status` transitions to `checked_out`, stamp
  `checked_out_at = now()` (the actual handover moment), mirroring how selecting
  `returned` already auto-fills `returnedDate`.
- **What marks a booking collected:** the **status dropdown** drives it.
  Scanning is purely a visual checklist and is fully decoupled from the commit.
  Whenever status becomes `checked_out` and the booking is saved,
  `checked_out_at` is stamped.
- **Tick-state storage:** a `Set<string>` of scanned item IDs owned by
  `useBookingCollection`, decoupled from the `Booking` type.

## Behavior

| Area | Before | After |
|---|---|---|
| Scan a QR | Sets `item.collectedAt`, mutates the draft booking | Adds item id to a local `Set`; shows a transient "Scanned" tick |
| All items scanned | Auto-closes scanner **and auto-saves** | Auto-closes scanner; **no save, no status change** |
| Marking collected | Implicit, per-item | Explicit: status → `checked_out` via dropdown, then Save |
| `checked_out_at` | Untouched by scanning | Stamped to `now` on the `→ checked_out` transition |
| Item display | Green "Collected" badge + per-item timestamp | Transient "Scanned" tick during a scan session only |

## Components / files

**Types + data layer (this alone restores booking visibility):**
- `packages/types/src/equipment/booking.ts` — drop `collectedAt` from `BookingItem`.
- `apps/console/src/data/booking-row.ts` — drop `collected_at` from `BOOKING_SELECT`,
  `BookingItemRow`, and `mapBookingItem`.
- `apps/console/src/data/mutate-booking.ts` — remove the per-item `collected_at`
  write loop; `updateBooking` updates only the booking header then re-selects.

**Scan flow:**
- `apps/console/src/features/equipment/booking-scan-helpers.ts` — keep
  `normalizeScannedValue` + `findBookingItemFromScan`; replace the
  `collectedAt`-based helpers with `areAllItemsScanned(items, scannedIds)`;
  remove `buildCollectedBookingDraft`.
- `apps/console/src/features/equipment/use-booking-collection.ts` — own a
  `Set<string>` of scanned IDs (reset when `booking.id` changes); drop
  `onDraftChange`/`onCollectionComplete`; expose `scannedItemIds`.
- `apps/console/src/features/equipment/booking-items-section.tsx` — remove the
  per-item collected badge/timestamp; add an optional `scannedItemIds` prop that
  renders a transient "Scanned" tick.
- `apps/console/src/features/equipment/booking-scan-modal.tsx` — wording: the
  counter reads "X of Y scanned".
- `apps/console/src/features/equipment/use-booking-store.ts` — remove the
  now-unused `REPLACE_DRAFT` action and the `save(draftOverride)` parameter.

**Screens (both share the hook + section):**
- `apps/console/src/screens/equipment/booking/detail/page.tsx`
- `apps/console/src/features/equipment/booking-drawer.tsx`
  - Rewire `useBookingCollection` (drop the removed callbacks).
  - Pass `scannedItemIds` to `BookingItemsSection`.
  - In `handleSelectStatus`, stamp `checkedOutDate = now` on the
    `→ checked_out` transition.

**Schema:**
- `docs/phases/phase-01-schema.sql` — remove the `collected_at` column from
  `booking_items`.
- Delete `docs/phases/patches/2026-05-31-booking-item-collected-at.sql`.

## Bug-fix note

Removing `collected_at` from `BOOKING_SELECT` returns the booking query to its
pre-`22acb12` shape, which the live database already supports. The original
"can't see any bookings" failure is resolved with **no database change required.**

## Out of scope

- The `BarcodeDetector`-based camera scanning in `use-qr-scanner.ts` is unchanged
  (still Chromium/Android only; unsupported browsers show the existing empty state).
- `vite.config.ts` / `tsconfig.app.json` changes from `22acb12` are unrelated and
  left as-is.
