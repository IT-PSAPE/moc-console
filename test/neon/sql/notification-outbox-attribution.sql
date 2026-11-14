BEGIN;

SELECT set_config('moc.test_workspace_id', (SELECT id::text FROM public.workspaces WHERE slug='default-workspace'), true);

-- A real public request insert runs the existing notification trigger under
-- the requester actor context.
SET LOCAL ROLE moc_public;
SELECT set_config('moc.user_id', '', true),
       set_config('moc.workspace_id', current_setting('moc.test_workspace_id'), true),
       set_config('moc.actor_kind', 'requester', true),
       set_config('moc.actor_name', '', true);
SELECT public.public_submit_request(
  current_setting('moc.test_workspace_id')::uuid,
  'Attribution requester request', 'video_production', now() + interval '1 day',
  'Requester Example', 'Who', 'What', 'When', 'Where', 'Why', 'How'
);

SET LOCAL ROLE moc_worker;
DO $$
DECLARE
  actor jsonb;
  request_id uuid;
BEGIN
  SELECT entity_id,payload->'telegramActor' INTO request_id,actor
  FROM public.notification_outbox
  WHERE event_type='request.created' AND payload->>'title'='Attribution requester request'
  ORDER BY created_at DESC LIMIT 1;
  IF request_id IS NULL THEN RAISE EXCEPTION 'Public request did not enqueue an announcement'; END IF;
  IF actor IS DISTINCT FROM '{"source":"requester","name":"Requester Example"}'::jsonb THEN
    RAISE EXCEPTION 'Requester attribution mismatch: %', actor;
  END IF;
  PERFORM set_config('moc.test_request_id',request_id::text,true);
END $$;

-- An authenticated status update enters through the existing trigger and
-- resolves the trusted member identity from the transaction context.
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
       set_config('moc.workspace_id',current_setting('moc.test_workspace_id'),true),
       set_config('moc.actor_kind','member',true),
       set_config('moc.actor_name','',true);
UPDATE public.requests SET status='in_progress'
WHERE id=current_setting('moc.test_request_id')::uuid;

SET LOCAL ROLE moc_worker;
DO $$
DECLARE actor jsonb;
BEGIN
  SELECT payload->'telegramActor' INTO actor FROM public.notification_outbox
  WHERE entity_id=current_setting('moc.test_request_id')::uuid AND event_type='request.status_changed';
  IF actor IS DISTINCT FROM '{"source":"member","name":"Ada Admin"}'::jsonb THEN
    RAISE EXCEPTION 'Member update attribution mismatch: %', actor;
  END IF;

  -- Retry merges preserve the first snapshot even if the retry contains a
  -- conflicting attribution value.
  UPDATE public.notification_outbox
  SET payload=payload||'{"title":"Retry","telegramActor":{"source":"member","name":"Eli Editor"}}'::jsonb
  WHERE entity_id=current_setting('moc.test_request_id')::uuid AND event_type='request.status_changed';
  SELECT payload->'telegramActor' INTO actor FROM public.notification_outbox
  WHERE entity_id=current_setting('moc.test_request_id')::uuid AND event_type='request.status_changed';
  IF actor IS DISTINCT FROM '{"source":"member","name":"Ada Admin"}'::jsonb THEN
    RAISE EXCEPTION 'Outbox retry changed original member attribution: %', actor;
  END IF;
END $$;

-- Assignment creation stores its actor on the assignment row. Replaying an
-- unchanged duty as another member retains the first assigner; changing the
-- duty snapshots the new actor.
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
       set_config('moc.workspace_id',current_setting('moc.test_workspace_id'),true),
       set_config('moc.actor_kind','member',true),
       set_config('moc.actor_name','',true);
INSERT INTO public.request_assignees(request_id,user_id,duty)
VALUES(current_setting('moc.test_request_id')::uuid,'20000000-0000-4000-8000-000000000002','Initial duty');

SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000002',true),
       set_config('moc.workspace_id',current_setting('moc.test_workspace_id'),true),
       set_config('moc.actor_kind','member',true),
       set_config('moc.actor_name','',true);
UPDATE public.request_assignees SET duty=duty
WHERE request_id=current_setting('moc.test_request_id')::uuid AND user_id='20000000-0000-4000-8000-000000000002';

SET LOCAL ROLE moc_worker;
DO $$
DECLARE actor jsonb;
BEGIN
  SELECT telegram_actor INTO actor FROM public.request_assignees
  WHERE request_id=current_setting('moc.test_request_id')::uuid AND user_id='20000000-0000-4000-8000-000000000002';
  IF actor IS DISTINCT FROM '{"source":"member","name":"Ada Admin"}'::jsonb THEN
    RAISE EXCEPTION 'Unchanged assignment retry changed original attribution: %', actor;
  END IF;
END $$;

SET LOCAL ROLE moc_app;
UPDATE public.request_assignees SET duty='Updated duty'
WHERE request_id=current_setting('moc.test_request_id')::uuid AND user_id='20000000-0000-4000-8000-000000000002';

SET LOCAL ROLE moc_worker;
DO $$
DECLARE actor jsonb;
BEGIN
  SELECT telegram_actor INTO actor FROM public.request_assignees
  WHERE request_id=current_setting('moc.test_request_id')::uuid AND user_id='20000000-0000-4000-8000-000000000002';
  IF actor IS DISTINCT FROM '{"source":"member","name":"Eli Editor"}'::jsonb THEN
    RAISE EXCEPTION 'Changed assignment duty did not record the new actor: %', actor;
  END IF;
END $$;

-- A delayed Telegram callback must not move a completed request backwards or
-- emit another status notification. Complete once from not_started, then
-- replay the stale Start and Complete actions against the persisted row.
SET LOCAL ROLE moc_public;
SELECT set_config('moc.user_id', '', true),
       set_config('moc.workspace_id', current_setting('moc.test_workspace_id'), true),
       set_config('moc.actor_kind', 'requester', true),
       set_config('moc.actor_name', '', true);
SELECT public.public_submit_request(
  current_setting('moc.test_workspace_id')::uuid,
  'Telegram transition guard request', 'video_production', now() + interval '1 day',
  'Requester Example', 'Who', 'What', 'When', 'Where', 'Why', 'How'
);

SET LOCAL ROLE moc_worker;
DO $$
DECLARE
  request_id uuid;
  outbox_count bigint;
  result jsonb;
BEGIN
  SELECT entity_id INTO request_id FROM public.notification_outbox
  WHERE event_type='request.created' AND payload->>'title'='Telegram transition guard request'
  ORDER BY created_at DESC LIMIT 1;
  IF request_id IS NULL THEN RAISE EXCEPTION 'Telegram transition guard request was not created'; END IF;

  SELECT count(*) INTO outbox_count FROM public.notification_outbox WHERE entity_id=request_id;
  result := public.api_apply_telegram_action('tg-admin', 'request', request_id, 'complete');
  IF result->>'status' IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Telegram completion from not_started failed: %', result;
  END IF;
  result := public.api_apply_telegram_action('tg-admin', 'request', request_id, 'start');
  IF result->>'error' IS DISTINCT FROM 'invalid_transition' OR result->>'status' IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Stale Telegram Start was not rejected: %', result;
  END IF;
  result := public.api_apply_telegram_action('tg-admin', 'request', request_id, 'complete');
  IF result->>'error' IS DISTINCT FROM 'invalid_transition' OR result->>'status' IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Repeated Telegram Complete was not rejected: %', result;
  END IF;
  IF (SELECT status::text FROM public.requests WHERE id=request_id) IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Telegram stale action changed persisted request status';
  END IF;
  IF (SELECT count(*) FROM public.notification_outbox WHERE entity_id=request_id) <> outbox_count THEN
    RAISE EXCEPTION 'Telegram action emitted an extra outbox row';
  END IF;
END $$;

-- Provider sync uses the worker source metadata supplied by withActor.
SELECT set_config('moc.user_id','',true),
       set_config('moc.actor_kind','integration',true),
       set_config('moc.actor_name','YouTube',true);
INSERT INTO public.notification_outbox(workspace_id,event_type,entity_type,entity_id,event_key,payload)
SELECT id,'stream.created','stream','90000000-0000-4000-8000-000000000001','attribution:youtube','{"title":"Imported stream"}'::jsonb
FROM public.workspaces WHERE slug='default-workspace';
DO $$
DECLARE actor jsonb;
BEGIN
  SELECT payload->'telegramActor' INTO actor FROM public.notification_outbox WHERE event_key='attribution:youtube';
  IF actor IS DISTINCT FROM '{"source":"automation","name":"YouTube"}'::jsonb THEN
    RAISE EXCEPTION 'Provider automation attribution mismatch: %', actor;
  END IF;
END $$;

-- Automatic request archiving is explicitly silent; it does not emit an
-- archive message that might be credited to the system actor.
RESET ROLE;
ALTER TABLE public.requests DISABLE TRIGGER set_updated_at;
SET LOCAL ROLE moc_worker;
UPDATE public.requests SET status='completed', updated_at=now()-interval '30 days'
WHERE id=current_setting('moc.test_request_id')::uuid;
RESET ROLE;
ALTER TABLE public.requests ENABLE TRIGGER set_updated_at;
SET LOCAL ROLE moc_worker;
SELECT public.archive_completed_requests();
DO $$
BEGIN
  IF (SELECT status FROM public.requests WHERE id=current_setting('moc.test_request_id')::uuid) IS DISTINCT FROM 'archived' THEN
    RAISE EXCEPTION 'Archive fixture did not archive its request';
  END IF;
  IF EXISTS(SELECT 1 FROM public.notification_outbox
    WHERE entity_id=current_setting('moc.test_request_id')::uuid AND event_type='request.archived') THEN
    RAISE EXCEPTION 'Silent archive unexpectedly enqueued a notification';
  END IF;
END $$;

-- Migration-owner writes have no application actor, even if actor settings
-- from an earlier operation are still present in the transaction.
RESET ROLE;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
       set_config('moc.actor_kind','integration',true),
       set_config('moc.actor_name','YouTube',true);
INSERT INTO public.notification_outbox(workspace_id,event_type,entity_type,entity_id,event_key,payload)
VALUES(current_setting('moc.test_workspace_id')::uuid,'stream.created','stream','90000000-0000-4000-8000-000000000002',
       'attribution:maintenance','{"title":"Maintenance import"}'::jsonb);
UPDATE public.notification_outbox SET payload=payload||'{"title":"Maintenance retry"}'::jsonb
WHERE event_key='attribution:maintenance';
DO $$
BEGIN
  IF (SELECT payload->'telegramActor' FROM public.notification_outbox WHERE event_key='attribution:maintenance')
     IS DISTINCT FROM '{"source":"unknown"}'::jsonb THEN
    RAISE EXCEPTION 'Maintenance write attributed to an application actor';
  END IF;
END $$;

ROLLBACK;
