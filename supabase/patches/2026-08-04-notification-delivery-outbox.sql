-- Durable Telegram delivery queue.
--
-- Every notification target is first persisted as a pending delivery. The API
-- may attempt it immediately, but a failed attempt remains eligible for the
-- delivery cron instead of being lost after an entity-level "notified" claim.

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,
  entity_type         text        NOT NULL,
  entity_id           uuid        NOT NULL,
  event_key           text        NOT NULL UNIQUE,
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'dispatched', 'failed')),
  attempt_count       integer     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_attempt_at     timestamptz NULL,
  last_error          text        NULL,
  dispatched_at       timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_ready_idx
  ON public.notification_outbox (next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_key           text        NOT NULL,
  event_type          text        NULL,
  scope               text        NOT NULL CHECK (scope IN ('group', 'dm')),
  route_id            uuid        NULL REFERENCES public.notification_routes(id) ON DELETE SET NULL,
  recipient_user_id   uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  destination_key     text        NOT NULL,
  chat_id             text        NOT NULL,
  thread_id           bigint      NULL,
  text                text        NOT NULL,
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count       integer     NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_attempt_at     timestamptz NULL,
  sent_at             timestamptz NULL,
  telegram_message_id bigint      NULL,
  last_error          text        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, destination_key)
);

CREATE INDEX IF NOT EXISTS notification_deliveries_ready_idx
  ON public.notification_deliveries (next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS notification_deliveries_workspace_created_idx
  ON public.notification_deliveries (workspace_id, created_at DESC);

DROP TRIGGER IF EXISTS set_notification_outbox_updated_at ON public.notification_outbox;
CREATE TRIGGER set_notification_outbox_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notification_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER set_notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Delivery rows contain message content and recipient destinations. They are
-- written and retried exclusively by the service-role API until a dedicated
-- operator history surface is introduced.

CREATE OR REPLACE FUNCTION public.enqueue_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
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

DROP TRIGGER IF EXISTS requests_enqueue_notification ON public.requests;
CREATE TRIGGER requests_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_request_notification();

CREATE OR REPLACE FUNCTION public.enqueue_booking_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
BEGIN
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

DROP TRIGGER IF EXISTS bookings_enqueue_notification ON public.bookings;
CREATE TRIGGER bookings_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_booking_notification();

CREATE OR REPLACE FUNCTION public.enqueue_stream_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'stream.created',
    'stream',
    NEW.id,
    format('stream.created:%s', NEW.id),
    jsonb_build_object(
      'title', NEW.title,
      'scheduledStartTime', NEW.scheduled_start_time,
      'streamUrl', NEW.stream_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS streams_enqueue_created_notification ON public.streams;
CREATE TRIGGER streams_enqueue_created_notification
  AFTER INSERT ON public.streams
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_stream_created_notification();

CREATE OR REPLACE FUNCTION public.enqueue_meeting_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'meeting.created',
    'meeting',
    NEW.id,
    format('meeting.created:%s', NEW.id),
    jsonb_build_object(
      'topic', NEW.topic,
      'startTime', NEW.start_time,
      'joinUrl', NEW.join_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zoom_meetings_enqueue_created_notification ON public.zoom_meetings;
CREATE TRIGGER zoom_meetings_enqueue_created_notification
  AFTER INSERT ON public.zoom_meetings
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_meeting_created_notification();
