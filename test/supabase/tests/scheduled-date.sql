BEGIN;
\ir assert-rejected.sql
DO $$
DECLARE bad text; kind text; actor uuid:='20000000-0000-4000-8000-000000000002'; workspace uuid:='10000000-0000-4000-8000-000000000001'; template uuid; schedule uuid; occurrence uuid; revision integer; original_send date; original_expiry timestamptz;
BEGIN
 FOREACH kind IN ARRAY ARRAY['announcement','pre_attendance'] LOOP
  PERFORM private.scheduled_validate_fields(kind,'{"title":"Service","date":"2026-10-04"}');
  PERFORM private.scheduled_validate_fields(kind,'{"title":"Service","date":""}');
  PERFORM private.scheduled_validate_fields(kind,'{"title":"Service","date":"2028-02-29"}');
 END LOOP;
 FOREACH bad IN ARRAY ARRAY['2026-02-29','2026-04-31','2026-13-04','04/10/43','2026-10-04T07:30','0000-01-01'] LOOP
  PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_fields(''announcement'',%L::jsonb)',jsonb_build_object('title','Service','date',bad)),'date');
 END LOOP;
 template:=public.save_scheduled_template(actor,workspace,'{"name":"Date test","messageType":"announcement","body":"{{title}} {{date}}","fields":{"title":"Service","date":"2026-10-04"},"audience":[]}');
 schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',current_date,'frequency','daily','expiryHours',72,'autoSend',false,'fields',jsonb_build_object('date','2026-10-05')));
 SELECT o.id,o.revision,o.send_on,o.expires_at INTO STRICT occurrence,revision,original_send,original_expiry FROM public.scheduled_message_occurrences o WHERE o.schedule_id=schedule AND o.occurrence_on=current_date;
 IF (SELECT fields->>'date' FROM public.scheduled_message_occurrences WHERE id=occurrence)<>'2026-10-05' THEN RAISE EXCEPTION 'Schedule overrides must retain Gregorian date'; END IF;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,revision,'date','2026-10-06','future');
 IF EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND fields->>'date'<>'2026-10-06') THEN RAISE EXCEPTION 'Future date edit did not update occurrences'; END IF;
 IF (SELECT send_on FROM public.scheduled_message_occurrences WHERE id=occurrence)<>original_send OR (SELECT expires_at FROM public.scheduled_message_occurrences WHERE id=occurrence)<>original_expiry THEN RAISE EXCEPTION 'Message date must not change delivery or expiry'; END IF;
 IF (SELECT fields->>'date' FROM public.scheduled_message_templates WHERE id=template)<>'2026-10-04' THEN RAISE EXCEPTION 'Occurrence edits must not change template defaults'; END IF;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,revision+1,'date','2026-10-07','occurrence');
 IF (SELECT fields->>'date' FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+1)<>'2026-10-06' THEN RAISE EXCEPTION 'Individual date edit affected future occurrence'; END IF;
END $$;
ROLLBACK;
