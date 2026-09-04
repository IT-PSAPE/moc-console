-- 2026-09-04 — Data API grants for the venue booking tables.
--
-- 20260904140000_venue_booking_domain created `venues`, `venue_bookings` and
-- `venue_booking_slots` with RLS and policies, but granted only EXECUTE on its
-- functions. Since patches/2026-08-04-moc-console-target-schema-cleanup.sql
-- adopted deny-by-default Data API privileges — it revoked the schema-wide
-- ALTER DEFAULT PRIVILEGES for anon, authenticated AND service_role — a newly
-- created public table starts with no table privileges for anyone. PostgREST
-- therefore answered every venue query with 42501 "permission denied for
-- table venues" before RLS was ever consulted: the console's settings Venues
-- tab could not load, and the API could not read the venue booking whose
-- notification it was enriching.
--
-- The grants below mirror the policies the domain migration already created,
-- so privilege and policy say the same thing:
--   * venues            — the settings tab reads, creates, edits, deactivates
--                         and deletes, and there is a policy for each.
--   * venue_bookings    — read, cancel/restore and delete, but NO insert: the
--                         console never creates a submission, and the only
--                         writer is the SECURITY DEFINER
--                         public_submit_venue_booking.
--   * venue_booking_slots — read only, matching its single SELECT policy; the
--                         slot rows are written by the submit RPC and the
--                         parent-sync triggers, never by a client.
-- anon gets nothing: the public flow reaches this domain only through the
-- SECURITY DEFINER public_* RPCs, which already carry their EXECUTE grants.

BEGIN;

-- Start from nothing rather than adding to whatever is already there, so the
-- end state is these grants exactly — on the live database, which currently
-- has none, and on any database where an earlier hand-run GRANT left a wider
-- set behind.
REVOKE ALL ON TABLE
  public.venues,
  public.venue_bookings,
  public.venue_booking_slots
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venues TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.venue_bookings TO authenticated;
GRANT SELECT ON TABLE public.venue_booking_slots TO authenticated;

GRANT ALL ON TABLE
  public.venues,
  public.venue_bookings,
  public.venue_booking_slots
TO service_role;

COMMIT;
