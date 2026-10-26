\ir assert-rejected.sql
BEGIN;
SET LOCAL ROLE moc_worker;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
DO $$
DECLARE schedule uuid; occurrence uuid; rev integer; captured integer; changed integer; delivery uuid;
 workspace uuid := (SELECT id FROM public.workspaces WHERE slug='default-workspace');
 actor uuid := '20000000-0000-4000-8000-000000000001';
BEGIN
 schedule := public.create_scheduled_schedule(actor,workspace,jsonb_build_object(
  'groupChatId','-1000000000001','startsOn',current_date+1,'untilOn',current_date+3,'frequency','daily','autoSend',false,
  'body','{{title}}','fields',jsonb_build_object('title','Before','instructions','Initial'),
  'messageType','announcement','attendeeIds',jsonb_build_array(actor)));
 SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule ORDER BY occurrence_on LIMIT 1;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'title','Occurrence title');
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE item_id=occurrence AND changes @> '[{"field":"title","before":"Before","after":"Occurrence title"}]') THEN RAISE EXCEPTION 'Nested occurrence field edit missing'; END IF;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'instructions','Series instructions','series');
 SELECT count(*) INTO captured FROM public.item_activity WHERE workspace_id=workspace AND changes @> '[{"field":"instructions","after":"Series instructions"}]';
 SELECT count(*) INTO changed FROM public.scheduled_message_occurrences WHERE schedule_id=schedule;
 IF captured<>changed OR captured<2 THEN RAISE EXCEPTION 'Series field edit missing from affected occurrence histories'; END IF;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'title','Future title','future');
 IF (SELECT count(*) FROM public.item_activity WHERE workspace_id=workspace AND changes @> '[{"field":"title","after":"Future title"}]')<>changed THEN RAISE EXCEPTION 'Future field edit missing'; END IF;
 UPDATE public.scheduled_message_occurrences SET fields=fields||'{"unexpectedCredential":"SECRET"}'::jsonb,revision=revision+1 WHERE id=occurrence;
 IF EXISTS(SELECT 1 FROM public.item_activity WHERE changes::text LIKE '%SECRET%' OR details::text LIKE '%SECRET%') THEN RAISE EXCEPTION 'Arbitrary message fields leaked'; END IF;
 UPDATE public.scheduled_message_schedules SET auto_send=true,send_time='09:00' WHERE id=schedule;
 IF (SELECT count(*) FROM public.item_activity WHERE workspace_id=workspace AND event_type='schedule_updated' AND jsonb_array_length(changes)=2)<>changed THEN RAISE EXCEPTION 'Series schedule configuration edit missing'; END IF;
 INSERT INTO public.notification_deliveries(workspace_id,event_key,scope,destination_key,chat_id,text,scheduled_occurrence_id,scheduled_operation)
 VALUES(workspace,'discussion-delivery','group','discussion-destination','-1000000000001','Message',occurrence,'send') RETURNING id INTO delivery;
 UPDATE public.notification_deliveries SET status='sent' WHERE id=delivery;
 UPDATE public.notification_deliveries SET status='sent',attempt_count=attempt_count+1 WHERE id=delivery;
 IF (SELECT count(*) FROM public.item_activity WHERE item_id=occurrence AND event_type='delivery_sent')<>1 THEN RAISE EXCEPTION 'Delivery retry duplicated event'; END IF;
END $$;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.item_activity WHERE item_kind='scheduled-message') THEN RAISE EXCEPTION 'Scheduled body/recipient snapshots exposed to viewer'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
