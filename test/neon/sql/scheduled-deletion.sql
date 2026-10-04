BEGIN;
\ir assert-rejected.sql
DO $$
DECLARE actor uuid:='20000000-0000-4000-8000-000000000002'; viewer uuid:='20000000-0000-4000-8000-000000000003'; workspace uuid:=(SELECT id FROM public.workspaces WHERE slug='default-workspace'); audience uuid[]; template uuid; schedule uuid; recurring uuid; occurrence uuid; first_occurrence uuid; future_occurrence uuid; leased_occurrence uuid; rev integer; delivery uuid; snapshot jsonb; affected uuid[]; count_before integer;
BEGIN
 SELECT ARRAY[id] INTO audience FROM public.workspace_member_types WHERE workspace_id=workspace AND is_default;
 template:=public.save_scheduled_template(actor,workspace,jsonb_build_object('name','Deletion test','messageType','pre_attendance','body','{{title}}','fields',jsonb_build_object('title','Deletable service'),'audience',to_jsonb(audience)));
 schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',clock_timestamp(),'frequency','once','expiryHours',72,'autoSend',false));
 SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule;
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_occurrence(%L,%L,%s)',viewer,occurrence,rev),'Not authorised');
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_occurrence(%L,%L,%s)',actor,occurrence,rev+1),'changed');
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_occurrence(%L,%L,%s,%L)',actor,occurrence,rev,'series'),'Invalid delete scope');
 PERFORM public.request_scheduled_send(actor,occurrence);
 affected:=public.delete_scheduled_occurrence(actor,occurrence,rev);
 IF affected<>ARRAY[occurrence] OR (SELECT state FROM public.scheduled_message_occurrences WHERE id=occurrence)<>'cancelled' THEN RAISE EXCEPTION 'Unsent message was not cancelled'; END IF;
 IF EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND status IN ('pending','processing')) THEN RAISE EXCEPTION 'Deleted unsent message remains queued'; END IF;
 PERFORM public.materialize_scheduled_messages(schedule);
 IF (SELECT count(*) FROM public.scheduled_message_occurrences WHERE schedule_id=schedule)<>1 OR (SELECT state FROM public.scheduled_message_occurrences WHERE id=occurrence)<>'cancelled' THEN RAISE EXCEPTION 'Materialization resurrected a deleted occurrence'; END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.request_scheduled_send(%L,%L)',actor,occurrence),'cannot be sent');
 affected:=public.delete_scheduled_occurrence(actor,occurrence,rev);
 IF affected<>ARRAY[occurrence] THEN RAISE EXCEPTION 'Confirmed deletion is not retry-safe'; END IF;
 -- Recurring future deletion retains earlier cards and prevents materialization
 -- beyond the 32-day horizon, rather than only hiding today's known rows.
 recurring:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',clock_timestamp(),'frequency','daily','expiryHours',72,'autoSend',false));
 SELECT id INTO STRICT first_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=recurring ORDER BY occurrence_on LIMIT 1;
 SELECT id INTO STRICT future_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=recurring ORDER BY occurrence_on OFFSET 1 LIMIT 1;
 SELECT id INTO STRICT leased_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=recurring ORDER BY occurrence_on OFFSET 2 LIMIT 1;
 PERFORM public.request_scheduled_send(actor,first_occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=first_occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,(snapshot->'occurrence'->>'revision')::integer,77331);
 UPDATE public.notification_deliveries SET status='sent' WHERE id=delivery;
 PERFORM public.respond_scheduled_attendance(viewer,first_occurrence,1,'attending','08:15');
 UPDATE public.scheduled_message_occurrences SET delivery_lease=gen_random_uuid(),lease_until=clock_timestamp()+interval '1 minute' WHERE id=leased_occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_occurrence(%L,%L,1,%L)',actor,future_occurrence,'future'),'delivery is in progress');
 IF (SELECT state FROM public.scheduled_message_occurrences WHERE id=future_occurrence)<>'scheduled' OR (SELECT until_on FROM public.scheduled_message_schedules WHERE id=recurring) IS NOT NULL THEN RAISE EXCEPTION 'Busy deletion partially cancelled a series'; END IF;
 UPDATE public.scheduled_message_occurrences SET delivery_lease=NULL,lease_until=NULL WHERE id=leased_occurrence;
 affected:=public.delete_scheduled_occurrence(actor,future_occurrence,1,'future');
 IF NOT future_occurrence=ANY(affected) OR first_occurrence=ANY(affected) OR (SELECT state FROM public.scheduled_message_occurrences WHERE id=first_occurrence)<>'sent' THEN RAISE EXCEPTION 'Future scope removed an earlier sent card'; END IF;
 IF (SELECT until_on FROM public.scheduled_message_schedules WHERE id=recurring)<>(SELECT occurrence_on-1 FROM public.scheduled_message_occurrences WHERE id=future_occurrence) THEN RAISE EXCEPTION 'Future deletion did not end recurrence'; END IF;
 SELECT count(*) INTO count_before FROM public.scheduled_message_occurrences WHERE schedule_id=recurring;
 PERFORM public.materialize_scheduled_messages(recurring);
 IF (SELECT count(*) FROM public.scheduled_message_occurrences WHERE schedule_id=recurring)<>count_before OR EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE schedule_id=recurring AND occurrence_on>=(SELECT occurrence_on FROM public.scheduled_message_occurrences WHERE id=future_occurrence) AND state<>'cancelled') THEN RAISE EXCEPTION 'Future deletion was resurrected by materialization'; END IF;
 -- Entire series deletion disables recurrence and keeps saved attendance.
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=first_occurrence;
 affected:=public.delete_scheduled_occurrence(actor,first_occurrence,rev,'series');
 IF NOT first_occurrence=ANY(affected) OR (SELECT enabled FROM public.scheduled_message_schedules WHERE id=recurring) THEN RAISE EXCEPTION 'Entire series deletion did not stop recurrence'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=first_occurrence AND user_id=viewer AND status='attending' AND arrival_time='08:15') THEN RAISE EXCEPTION 'Deletion destroyed saved attendance'; END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,%L,%L)',viewer,first_occurrence,rev,'attending','09:00'),'Attendance is closed');
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=first_occurrence AND scheduled_operation='delete';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 IF snapshot->'occurrence'->>'state'<>'cancelled' OR (snapshot->'occurrence'->>'telegram_message_id')::bigint<>77331 THEN RAISE EXCEPTION 'Delete delivery lost the stored Telegram identity'; END IF;
 IF (public.begin_scheduled_delivery(delivery)->>'busy')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Delete delivery ignored an existing lease'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,(snapshot->'occurrence'->>'revision')::integer,NULL,'Temporary cleanup failure',false);
 UPDATE public.notification_deliveries SET status='failed' WHERE id=delivery;
 affected:=public.delete_scheduled_occurrence(actor,first_occurrence,rev,'series');
 IF (SELECT status FROM public.notification_deliveries WHERE id=delivery)<>'pending' OR (SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id=first_occurrence AND scheduled_operation='delete')<>1 THEN RAISE EXCEPTION 'Cleanup retry duplicated its delivery'; END IF;
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot:=public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,(snapshot->'occurrence'->>'revision')::integer,NULL);
 UPDATE public.notification_deliveries SET status='sent' WHERE id=delivery;
 PERFORM public.prepare_scheduled_messages();
 IF EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=ANY(affected) AND scheduled_operation<>'delete' AND status IN ('pending','processing')) THEN RAISE EXCEPTION 'Deleted messages were queued again'; END IF;
 IF (SELECT state FROM public.scheduled_message_occurrences WHERE id=first_occurrence)<>'cancelled' OR (SELECT last_sync_error FROM public.scheduled_message_occurrences WHERE id=first_occurrence) IS NOT NULL THEN RAISE EXCEPTION 'Successful Telegram deletion did not retain cancellation/clear failure'; END IF;
 IF has_function_privilege('moc_app','public.delete_scheduled_occurrence(uuid,uuid,integer,text)','EXECUTE') OR has_function_privilege('moc_public','public.delete_scheduled_occurrence(uuid,uuid,integer,text)','EXECUTE') THEN RAISE EXCEPTION 'Deletion RPC was exposed without service authorization'; END IF;
END $$;
ROLLBACK;
