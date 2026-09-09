-- 2026-08-10 — Delete finished YouTube streams and finished Zoom meetings.
--
-- DESTRUCTIVE. Rows are removed permanently and there is no application path to
-- bring them back: the YouTube sync no longer adopts a broadcast that has already
-- finished, and the Zoom sync only reads upcoming meetings. Take a backup first.
-- Run this against Supabase yourself — it is not executed by the app.
--
-- Nothing references public.streams or public.zoom_meetings by foreign key, so
-- these deletes cascade nowhere.
--
-- Preview the exact row counts before committing to anything:
--
--   SELECT count(*) FROM public.streams
--   WHERE stream_status = 'complete' OR actual_end_time IS NOT NULL;
--
--   SELECT count(*) FROM public.zoom_meetings
--   WHERE start_time IS NOT NULL
--     AND meeting_type IN ('instant', 'scheduled')
--     AND recurrence_type = 'none'
--     AND start_time + make_interval(mins => duration) < now();

BEGIN;

-- The set is captured once so the notification cleanup and the deletes below
-- cannot disagree about which rows are going.

CREATE TEMP TABLE finished_streams ON COMMIT DROP AS
SELECT id FROM public.streams
WHERE stream_status = 'complete'
   OR actual_end_time IS NOT NULL;

-- zoom_meetings has no status column, so "finished" is derived from the schedule:
-- the meeting had a start time and its duration has elapsed.
--
-- Recurring meetings are deliberately excluded. Their start_time is the FIRST
-- occurrence, so a past start_time says nothing about whether the series is over
-- — deleting those would drop meetings that are still running week to week.
-- Meetings with no start_time are excluded for the same reason: there is no
-- evidence they are finished.
CREATE TEMP TABLE finished_meetings ON COMMIT DROP AS
SELECT id FROM public.zoom_meetings
WHERE start_time IS NOT NULL
  AND meeting_type IN ('instant', 'scheduled')
  AND recurrence_type = 'none'
  AND start_time + make_interval(mins => duration) < now();

-- Retire any announcement still queued for a row being deleted. Both queues hold
-- their own copy of the message text, so a pending row would happily send a
-- Telegram notification about a stream that no longer exists. 'failed' is
-- terminal — the delivery workers only claim pending rows. Already-sent history
-- is left untouched.

UPDATE public.notification_outbox AS outbox
SET status = 'failed',
    next_attempt_at = now(),
    last_error = 'Retired: the stream or meeting was deleted as finished'
WHERE outbox.status IN ('pending', 'processing')
  AND (
    (outbox.entity_type = 'stream' AND outbox.entity_id IN (SELECT id FROM finished_streams))
    OR (outbox.entity_type = 'meeting' AND outbox.entity_id IN (SELECT id FROM finished_meetings))
  );

UPDATE public.notification_deliveries AS delivery
SET status = 'failed',
    next_attempt_at = now(),
    last_error = 'Retired: the stream or meeting was deleted as finished'
WHERE delivery.status IN ('pending', 'processing')
  AND delivery.event_key IN (
    SELECT format('stream.created:%s', id) FROM finished_streams
    UNION ALL
    SELECT format('meeting.created:%s', id) FROM finished_meetings
  );

DELETE FROM public.streams
WHERE id IN (SELECT id FROM finished_streams);

DELETE FROM public.zoom_meetings
WHERE id IN (SELECT id FROM finished_meetings);

-- Confirm the damage before committing.
SELECT
  (SELECT count(*) FROM finished_streams)  AS streams_deleted,
  (SELECT count(*) FROM finished_meetings) AS meetings_deleted;

COMMIT;

-- Not included, because it is a different question from "completed": broadcasts
-- that were scheduled months ago and never started. YouTube keeps returning them
-- as "upcoming" forever, and any that were adopted before the sync fix are still
-- sitting in the table. Uncomment and run separately if you want them gone too.
--
-- DELETE FROM public.streams
-- WHERE stream_status <> 'live'
--   AND actual_start_time IS NULL
--   AND scheduled_start_time IS NOT NULL
--   AND scheduled_start_time < now() - interval '7 days';
