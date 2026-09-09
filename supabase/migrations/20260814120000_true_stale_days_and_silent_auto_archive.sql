-- Two notification fixes:
--
-- 1. Stale alerts said "0 day(s)" even with a 2-day threshold. The claim
--    RPCs returned the post-UPDATE row, so whenever the unguarded baseline
--    set_updated_at() trigger is live, the claim itself reset updated_at to
--    now() and the cron computed days-since-activity as zero. The claims now
--    return the pre-claim timestamps plus a stale_days value computed in SQL,
--    so the reported day count can never be corrupted by trigger side
--    effects. The guarded set_updated_at() is also re-asserted here.
--
-- 2. The weekly auto-archive cron is documented as silent, but its bulk
--    UPDATE fired the requests/bookings status-change notification triggers,
--    announcing every auto-archived item on Telegram (bookings even landed in
--    the "status changed" topic since no booking.archived event exists). The
--    archive RPCs now raise a transaction-local flag that the enqueue
--    triggers honour, so bulk auto-archiving stays silent while manual
--    archive/status changes keep notifying through the configured routes.

BEGIN;

-- ── Guarded updated_at stamper ──
-- Stale-workflow bookkeeping writes must not reset the business activity
-- timestamp that staleness detection depends on.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('requests', 'bookings')
    AND (to_jsonb(NEW) - ARRAY[
      'updated_at',
      'stale_notified_at',
      'stale_notification_claimed_at',
      'stale_notification_event_key'
    ]) = (to_jsonb(OLD) - ARRAY[
      'updated_at',
      'stale_notified_at',
      'stale_notification_claimed_at',
      'stale_notification_event_key'
    ])
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── Stale claims return pre-claim timestamps + computed day counts ──
-- Return type changes, so the old functions must be dropped first.
DROP FUNCTION IF EXISTS public.claim_stale_requests();
DROP FUNCTION IF EXISTS public.claim_stale_bookings();

CREATE FUNCTION public.claim_stale_requests()
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  title text,
  status text,
  updated_at timestamptz,
  stale_notification_event_key text,
  stale_days integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT request_row.id,
           request_row.workspace_id,
           request_row.title,
           request_row.status,
           request_row.updated_at
    FROM public.requests AS request_row
    LEFT JOIN public.notification_settings AS settings
      ON settings.workspace_id = request_row.workspace_id
    WHERE request_row.status NOT IN ('archived', 'completed')
      AND request_row.updated_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
      AND (
        request_row.stale_notified_at IS NULL
        OR request_row.stale_notified_at < request_row.updated_at
      )
      AND (
        request_row.stale_notification_claimed_at IS NULL
        OR request_row.stale_notification_claimed_at < now() - interval '10 minutes'
      )
    FOR UPDATE OF request_row SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.requests AS request_row
    SET stale_notification_claimed_at = now(),
        stale_notification_event_key = coalesce(
          request_row.stale_notification_event_key,
          format('request.stale:%s:%s', request_row.id, gen_random_uuid())
        )
    FROM candidates
    WHERE request_row.id = candidates.id
    RETURNING request_row.id, request_row.stale_notification_event_key
  )
  SELECT candidates.id,
         candidates.workspace_id,
         candidates.title,
         candidates.status::text,
         candidates.updated_at,
         claimed.stale_notification_event_key,
         greatest(0, floor(extract(epoch FROM (now() - candidates.updated_at)) / 86400))::integer AS stale_days
  FROM candidates
  JOIN claimed ON claimed.id = candidates.id;
$$;

CREATE FUNCTION public.claim_stale_bookings()
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  title text,
  status text,
  tracking_code text,
  updated_at timestamptz,
  expected_return_at timestamptz,
  returned_at timestamptz,
  stale_notification_event_key text,
  is_overdue boolean,
  stale_days integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT booking_row.id,
           booking_row.workspace_id,
           booking_row.title,
           booking_row.status,
           booking_row.tracking_code,
           booking_row.updated_at,
           booking_row.expected_return_at,
           booking_row.returned_at,
           (booking_row.expected_return_at < now() AND booking_row.returned_at IS NULL) AS is_overdue
    FROM public.bookings AS booking_row
    LEFT JOIN public.notification_settings AS settings
      ON settings.workspace_id = booking_row.workspace_id
    WHERE booking_row.status NOT IN ('returned', 'archived')
      AND (
        booking_row.updated_at < now() - make_interval(days => coalesce(settings.stale_threshold_days, 3))
        OR (booking_row.expected_return_at < now() AND booking_row.returned_at IS NULL)
      )
      AND (
        booking_row.stale_notified_at IS NULL
        OR booking_row.stale_notified_at < booking_row.updated_at
        OR (
          booking_row.expected_return_at < now()
          AND booking_row.returned_at IS NULL
          AND booking_row.stale_notified_at < booking_row.expected_return_at
        )
      )
      AND (
        booking_row.stale_notification_claimed_at IS NULL
        OR booking_row.stale_notification_claimed_at < now() - interval '10 minutes'
      )
    FOR UPDATE OF booking_row SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.bookings AS booking_row
    SET stale_notification_claimed_at = now(),
        stale_notification_event_key = coalesce(
          booking_row.stale_notification_event_key,
          format('booking.stale:%s:%s', booking_row.id, gen_random_uuid())
        )
    FROM candidates
    WHERE booking_row.id = candidates.id
    RETURNING booking_row.id, booking_row.stale_notification_event_key
  )
  SELECT candidates.id,
         candidates.workspace_id,
         candidates.title,
         candidates.status::text,
         candidates.tracking_code,
         candidates.updated_at,
         candidates.expected_return_at,
         candidates.returned_at,
         claimed.stale_notification_event_key,
         candidates.is_overdue,
         CASE
           -- Overdue counts started days ("due yesterday" reads as 1, never 0);
           -- inactivity counts whole elapsed days (>= threshold by selection).
           WHEN candidates.is_overdue
             THEN greatest(1, ceil(extract(epoch FROM (now() - candidates.expected_return_at)) / 86400))::integer
           ELSE greatest(0, floor(extract(epoch FROM (now() - candidates.updated_at)) / 86400))::integer
         END AS stale_days
  FROM candidates
  JOIN claimed ON claimed.id = candidates.id;
$$;

COMMENT ON FUNCTION public.claim_stale_requests() IS
  'Claims requests once per stale activity episode; returns pre-claim activity timestamps and the computed stale day count.';
COMMENT ON FUNCTION public.claim_stale_bookings() IS
  'Claims bookings once per stale activity episode and once when newly overdue; returns pre-claim timestamps and the computed stale day count.';

GRANT EXECUTE ON FUNCTION public.claim_stale_requests() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stale_bookings() TO service_role;

-- ── Silent bulk auto-archive ──
CREATE OR REPLACE FUNCTION public.archive_completed_requests()
RETURNS SETOF public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bulk auto-archive is silent by design; the flag is transaction-local so
  -- manual archives (and every other status change) still notify.
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);
  RETURN QUERY
  UPDATE public.requests r
  SET status = 'archived',
      updated_at = now()
  WHERE r.id IN (
    SELECT r2.id
    FROM public.requests r2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = r2.workspace_id
    WHERE r2.status = 'completed'
      AND r2.updated_at < now() - make_interval(days => coalesce(ns.auto_archive_completed_requests_days, 7))
  )
  RETURNING r.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_returned_bookings()
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);
  RETURN QUERY
  UPDATE public.bookings b
  SET status = 'archived',
      updated_at = now()
  WHERE b.id IN (
    SELECT b2.id
    FROM public.bookings b2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = b2.workspace_id
    WHERE b2.status = 'returned'
      AND coalesce(b2.returned_at, b2.updated_at) < now() - make_interval(days => coalesce(ns.auto_archive_returned_bookings_days, 7))
  )
  RETURNING b.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'request.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := CASE WHEN NEW.status = 'archived'
      THEN 'request.archived'
      ELSE 'request.status_changed'
    END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'request',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.requested_by,
      'requestId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
  IF coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'booking.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'booking.status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'booking',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.booked_by,
      'trackingCode', NEW.tracking_code
    )
  );
  RETURN NEW;
END;
$$;

COMMIT;
