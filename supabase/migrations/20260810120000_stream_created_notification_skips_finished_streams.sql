-- A stream that is already over must never raise a "stream created"
-- notification.
--
-- The YouTube sync adopted broadcasts that had finished months earlier, and this
-- trigger queued an outbox event for every inserted row, so the nightly delivery
-- cron announced March and April streams in August. The sync no longer adopts
-- those broadcasts; this guard is the second line of defence and covers every
-- other insert path. The one-hour grace window matches the sync's own: a
-- broadcast scheduled a moment ago is about to start, not a leftover.

CREATE OR REPLACE FUNCTION public.enqueue_stream_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.stream_status = 'complete' OR NEW.actual_end_time IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.stream_status <> 'live'
    AND NEW.scheduled_start_time IS NOT NULL
    AND NEW.scheduled_start_time < now() - interval '1 hour'
  THEN
    RETURN NEW;
  END IF;

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

-- Retire announcements already queued for streams that are over, so the next
-- delivery run does not send the backlog this migration exists to prevent.
-- 'failed' is terminal: `processPendingOutbox` only claims pending rows.
UPDATE public.notification_outbox AS outbox
SET status = 'failed',
    next_attempt_at = now(),
    last_error = 'Retired: the stream had already finished when this event was queued'
WHERE outbox.status = 'pending'
  AND outbox.event_type = 'stream.created'
  AND EXISTS (
    SELECT 1
    FROM public.streams AS stream
    WHERE stream.id = outbox.entity_id
      AND (
        stream.stream_status = 'complete'
        OR stream.actual_end_time IS NOT NULL
        OR (
          stream.stream_status <> 'live'
          AND stream.scheduled_start_time IS NOT NULL
          AND stream.scheduled_start_time < now() - interval '1 hour'
        )
      )
  );
