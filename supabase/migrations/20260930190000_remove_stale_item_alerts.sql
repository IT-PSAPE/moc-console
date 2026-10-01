-- Retire stale-item alerts, including direct messages and group follow-ups.
-- Auto-archive and message-format settings remain in notification_settings.
BEGIN;

DROP FUNCTION IF EXISTS public.claim_stale_requests();
DROP FUNCTION IF EXISTS public.claim_stale_bookings();
DROP FUNCTION IF EXISTS public.complete_stale_request_notification(uuid, text);
DROP FUNCTION IF EXISTS public.complete_stale_booking_notification(uuid, text);

-- Remove retired routes and queued/retryable alerts so they cannot be delivered.
DELETE FROM public.notification_outbox WHERE event_type IN ('request.stale', 'booking.stale');
DELETE FROM public.notification_deliveries WHERE event_type IN ('request.stale', 'booking.stale');
DELETE FROM public.notification_routes WHERE event_type IN ('request.stale', 'booking.stale');
DELETE FROM public.notification_message_templates WHERE message_type IN ('request.stale', 'booking.stale');

DROP TABLE IF EXISTS public.notification_recipients;
ALTER TABLE public.notification_settings DROP COLUMN IF EXISTS stale_threshold_days;
ALTER TABLE public.requests
  DROP COLUMN IF EXISTS stale_notified_at,
  DROP COLUMN IF EXISTS stale_notification_claimed_at,
  DROP COLUMN IF EXISTS stale_notification_event_key;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS stale_notified_at,
  DROP COLUMN IF EXISTS stale_notification_claimed_at,
  DROP COLUMN IF EXISTS stale_notification_event_key;

-- Preserve the no-op update behavior without referring to retired bookkeeping.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('requests', 'bookings')
    AND (to_jsonb(NEW) - 'updated_at') = (to_jsonb(OLD) - 'updated_at')
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
