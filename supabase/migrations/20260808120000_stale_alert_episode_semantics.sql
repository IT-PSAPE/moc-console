-- Send one stale alert per period of inactivity instead of using the stale
-- threshold as a repeating reminder interval. A real business update starts a
-- new activity period. Bookings may also alert once when they newly cross the
-- expected-return deadline, even if an inactivity alert was sent beforehand.

CREATE OR REPLACE FUNCTION public.claim_stale_requests()
RETURNS SETOF public.requests
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT request_row.id
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
  )
  UPDATE public.requests AS request_row
  SET stale_notification_claimed_at = now(),
      stale_notification_event_key = coalesce(
        request_row.stale_notification_event_key,
        format('request.stale:%s:%s', request_row.id, gen_random_uuid())
      )
  FROM candidates
  WHERE request_row.id = candidates.id
  RETURNING request_row.*;
$$;

CREATE OR REPLACE FUNCTION public.claim_stale_bookings()
RETURNS SETOF public.bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH candidates AS (
    SELECT booking_row.id
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
  )
  UPDATE public.bookings AS booking_row
  SET stale_notification_claimed_at = now(),
      stale_notification_event_key = coalesce(
        booking_row.stale_notification_event_key,
        format('booking.stale:%s:%s', booking_row.id, gen_random_uuid())
      )
  FROM candidates
  WHERE booking_row.id = candidates.id
  RETURNING booking_row.*;
$$;

COMMENT ON FUNCTION public.claim_stale_requests() IS
  'Claims requests once per stale activity episode for notification delivery.';
COMMENT ON FUNCTION public.claim_stale_bookings() IS
  'Claims bookings once per stale activity episode and once when newly overdue.';
