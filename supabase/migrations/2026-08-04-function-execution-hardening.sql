-- 2026-08-04 — Fix mutable function paths and remove obsolete RPC exposure.
-- Applied to production as Supabase migration: harden_function_execution.

BEGIN;

-- Pin every public function that still inherits a caller-controlled search
-- path. Existing explicitly configured functions are left unchanged.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(procedure.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO pg_catalog, public, private, extensions',
      function_row.signature
    );
  END LOOP;
END;
$$;

-- Trigger functions are invoked by their trigger owner and must not be exposed
-- as Data API RPCs.
DO $$
DECLARE
  function_row record;
BEGIN
  FOR function_row IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      function_row.signature
    );
  END LOOP;
END;
$$;

-- Remove old public signatures that pre-date explicit workspace selection.
-- The current request application uses only the workspace-bound signatures.
DO $$
DECLARE
  signature regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    to_regprocedure('public.public_browse_equipment(text,public.equipment_category)'),
    to_regprocedure('public.public_browse_equipment(uuid,text,public.equipment_category)'),
    to_regprocedure('public.public_submit_booking(uuid,text,timestamptz,timestamptz,text)'),
    to_regprocedure('public.public_submit_booking(uuid,uuid,text,timestamptz,timestamptz,text)'),
    to_regprocedure('public.public_submit_request(text,public.request_priority,public.request_category,timestamptz,text,text,text,text,text,text,text,text,text,text)')
  ]
  LOOP
    IF signature IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        signature
      );
    END IF;
  END LOOP;
END;
$$;

-- These are signed-in application RPCs, not anonymous endpoints. They may
-- already have been removed by the feature-retirement patch.
DO $$
DECLARE
  signature regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    to_regprocedure('public.save_playlist_lanes(uuid,jsonb)'),
    to_regprocedure('public.upsert_event_playback_state(uuid,numeric,boolean,numeric)')
  ]
  LOOP
    IF signature IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
