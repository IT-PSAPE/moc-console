# Venue bookings with a derived lifecycle

MOC Request had two public submission flows: a work request and an equipment
booking. Venue booking is the third, and it is the first one where the thing
being reserved is a shared resource with a wall-clock schedule: a room, for a
block of time, that nobody else can hold at the same time.

That raises two questions the existing domains never had to answer. What is a
venue booking's status while time passes, and what stops two people booking the
same room at the same hour?

## Considered options

### The status while time passes

- **Store the status and move it on a schedule.** A cron flips `booked` →
  `in_progress` → `completed` as each booking's window arrives and passes.
  Rejected. It makes the truth of every row depend on a job having run: the
  console shows a booking as `booked` while the event is visibly in progress
  until the next tick. Vercel's Hobby plan also caps crons at one run per day,
  so the lag would be up to 24 hours, and the fix would be a paid plan for
  information the clock already tells us.
- **Derive the status everywhere and store nothing.** Rejected on its own:
  correct for display, but a derived value cannot fire a database trigger, so
  cancellations would raise no Telegram notification.
- **Store only what a human decides; derive the rest.** Chosen.

### Preventing a double booking

- **Check availability before inserting.** Rejected: two submissions that
  interleave both pass the check and both insert. The window is small and the
  failure is invisible.
- **An exclusion constraint over the booked range.** Workable, and it needs
  `btree_gist`. Rejected in favour of the option below, which answers
  availability with an equality lookup and needs no extension.
- **One row per 30-minute slot with a partial unique index.** Chosen.

## Decision

- **`venue_bookings.status` stores only `auto` and `cancelled`.** `auto` means
  "read the clock". `cancelled` is the single state a person sets.
- **The reader-facing phase is derived in two mirrored places.**
  `public.venue_booking_phase(status, starts_at, ends_at)` serves the database
  (tracking lookups, and the token the API renders into a Telegram message);
  `deriveVenueBookingPhase` in `@moc/types/venues` serves the console. Both
  return `booked | in_progress | completed | cancelled` and both follow the
  same order: cancelled wins, then past-end is completed, then past-start is
  in progress. Neither writes its result anywhere.
- **A booking is stored as one row per 30-minute slot.** `venue_booking_slots`
  carries a partial unique index on `(venue_id, slot_start) WHERE active`, so
  the second of two racing submissions is rejected by the database rather than
  by a check that can be outrun. `venue_id` and `active` are denormalised from
  the parent and overwritten by a `BEFORE` trigger, so a writer cannot set
  them to a lie.
- **Cancelling releases the slots and keeps the record.** `active` goes false,
  which drops the rows out of the unique index and returns the times to the
  availability grid, while the booking and the slots it held remain readable.
  Un-cancelling reclaims them and fails if someone has since taken them —
  which is the correct answer, so it is surfaced rather than swallowed.
- **The bookable day is 08:00–23:00 in the workspace's own time zone**, in 30
  minute steps, defined once by `public.venue_slot_grid`. Availability and
  submission validation both read that function, so the public picker cannot
  offer a slot the writer would reject. The zone comes from
  `notification_settings.timezone`, falling back to `Africa/Harare` when it is
  unset or unrecognised.
- **A booking is one continuous block in one venue on one day.** Enforced in
  `public_submit_venue_booking`, not only in the picker.
- **Two notification events, not five.** `venue_booking.created` and
  `venue_booking.cancelled`. The derived phases raise no events of their own
  because nothing happens at their boundaries — and because the phase is
  resolved when the message is rendered, a notification retried an hour later
  still reports the phase that is true when it is sent.
- **Notification routes gained a person as a destination.** `group_chat_id`
  became nullable and a `user_id` target was added, with a CHECK enforcing
  exactly one target. This applies to every event, not only venue bookings, so
  the console has one routing model rather than two.

## Consequences

- Nothing has to run on a schedule for a venue booking to read correctly. There
  is no new cron and no new Vercel plan requirement.
- The phase logic exists twice, in SQL and in TypeScript, and the two must be
  changed together. Both carry a comment saying so. The alternative — one
  implementation, fetched over the wire for every render — was worse.
- `venue_bookings.venue_id` is `ON DELETE RESTRICT`, so a venue that has ever
  been booked cannot be deleted; it is deactivated instead, which hides it from
  the public app while keeping past bookings intact. The settings UI says this
  rather than offering a delete that fails.
- Changing the bookable day means changing `venue_slot_grid` and the mirrored
  constants in `@moc/types/venues` together. Existing bookings outside a
  narrowed day keep their slots and stay valid.
- The console never creates a venue booking, matching requests and equipment
  bookings: submissions originate only in MOC Request.
