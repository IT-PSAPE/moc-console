-- 2026-08-04 — Emergency lock for privileged maintenance automation.
-- Applied to production as Supabase migration: lock_privileged_maintenance_rpcs.

BEGIN;

-- Revoke every overload so an obsolete signature cannot remain callable by an
-- exposed role. Internal cron/API automation continues through service_role.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'archive_completed_requests',
        'archive_returned_bookings',
        'claim_stale_bookings',
        'claim_stale_requests'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      function_row.signature
    );
  END LOOP;
END;
$$;

COMMIT;
