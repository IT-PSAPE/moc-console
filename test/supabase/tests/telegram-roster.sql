BEGIN;
DO $$
DECLARE actor uuid:='20000000-0000-4000-8000-000000000002'; viewer uuid:='20000000-0000-4000-8000-000000000003'; newly_linked uuid:='20000000-0000-4000-8000-000000000004'; workspace uuid:='10000000-0000-4000-8000-000000000001'; audience uuid[]; template uuid; schedule uuid; occurrence uuid; next_occurrence uuid; rev integer; delivery uuid; snapshot jsonb; frozen jsonb;
BEGIN
 SELECT array_agg(id) INTO audience FROM public.workspace_member_types WHERE workspace_id=workspace;
 template:=public.save_scheduled_template(actor,workspace,jsonb_build_object('name','Linked roster test','messageType','pre_attendance','body','{{title}}','fields',jsonb_build_object('title','Weekday service'),'audience',to_jsonb(audience)));
 schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',clock_timestamp(),'frequency','daily','expiryHours',72,'autoSend',false));
 SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule ORDER BY occurrence_on LIMIT 1;
 SELECT id INTO STRICT next_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule ORDER BY occurrence_on OFFSET 1 LIMIT 1;
 -- Eligibility is checked at send time, rather than cached when scheduling.
 UPDATE public.users SET telegram_chat_id='tg-newly-linked' WHERE id=newly_linked;
 UPDATE public.users SET telegram_chat_id=NULL WHERE id=viewer;
 UPDATE public.users SET telegram_chat_id='   ' WHERE id=actor;
 PERFORM public.request_scheduled_send(actor,occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 IF jsonb_array_length(snapshot->'responses')<>3 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'responses') r WHERE r->>'user_id'=newly_linked::text) THEN RAISE EXCEPTION 'Send ignored a newly connected attendee'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'responses') r WHERE r->>'user_id' IN (viewer::text,actor::text)) THEN RAISE EXCEPTION 'Send included a disconnected or blank-linked attendee'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,rev,77881);
 UPDATE public.notification_deliveries SET status='sent' WHERE id=delivery;
 PERFORM public.respond_scheduled_attendance(newly_linked,occurrence,rev,'attending','08:15');
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 SELECT jsonb_agg(to_jsonb(r) ORDER BY name,user_id) INTO frozen FROM public.scheduled_message_responses r WHERE occurrence_id=occurrence;
 UPDATE public.users SET telegram_chat_id=NULL WHERE id=newly_linked;
 UPDATE public.users SET telegram_chat_id='tg-viewer' WHERE id=viewer;
 PERFORM public.request_scheduled_resend(actor,occurrence,rev);
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='resend';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 IF snapshot->'responses' IS DISTINCT FROM frozen THEN RAISE EXCEPTION 'Resend rebuilt the frozen roster or removed a saved response'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,rev,77882);
 -- Each recurring occurrence gets its own roster from current connections.
 PERFORM public.request_scheduled_send(actor,next_occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=next_occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 IF jsonb_array_length(snapshot->'responses')<>3 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'responses') r WHERE r->>'user_id'=viewer::text) OR EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'responses') r WHERE r->>'user_id'=newly_linked::text) THEN RAISE EXCEPTION 'Recurring occurrence reused outdated Telegram eligibility'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'responses') r WHERE r->>'status'<>'awaiting') THEN RAISE EXCEPTION 'Recurring occurrence copied earlier responses'; END IF;
END $$;
ROLLBACK;
