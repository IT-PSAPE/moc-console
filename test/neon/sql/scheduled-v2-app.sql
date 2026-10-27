BEGIN;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);

DO $$ BEGIN
 IF NOT has_function_privilege('moc_app','public.create_scheduled_schedule(uuid,uuid,jsonb)','EXECUTE')
  OR NOT has_function_privilege('moc_app','public.respond_scheduled_attendance(uuid,uuid,integer,text,text,text,text)','EXECUTE')
  OR NOT has_function_privilege('moc_app','public.check_in_scheduled_attendance(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'moc_app is missing scheduled-message API RPC privileges';
 END IF;
 IF has_function_privilege('moc_public','public.create_scheduled_schedule(uuid,uuid,jsonb)','EXECUTE')
  OR has_function_privilege('moc_public','public.respond_scheduled_attendance(uuid,uuid,integer,text,text,text,text)','EXECUTE')
  OR has_function_privilege('moc_public','public.check_in_scheduled_attendance(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'The public viewer role can execute scheduled-message mutation RPCs';
 END IF;
 IF has_table_privilege('moc_app','public.scheduled_message_occurrences','UPDATE') THEN
  RAISE EXCEPTION 'moc_app was granted broad scheduled-occurrence UPDATE for row locking';
 END IF;
END $$;

SET LOCAL ROLE moc_app;
DO $$
DECLARE schedule_id uuid; actor uuid:=moc_private.actor_id(); workspace_id uuid:=current_setting('moc.workspace_id')::uuid;
BEGIN
 schedule_id:=public.create_scheduled_schedule(actor,workspace_id,jsonb_build_object(
  'messageType','attendance','body','App RPC test','attendeeIds',jsonb_build_array(actor::text,'20000000-0000-4000-8000-000000000003'),
  'attendanceGroups','[]'::jsonb,'groupChatId','-1000000000001','sendNow',true,'followUpMinutes',1));
 PERFORM set_config('moc.scheduled_v2_app_schedule',schedule_id::text,true);
END $$;

RESET ROLE;
SET LOCAL ROLE moc_worker;
DO $$
DECLARE v_schedule_id uuid:=current_setting('moc.scheduled_v2_app_schedule')::uuid; primary_id uuid; child_id uuid; delivery_id uuid; snap jsonb;
BEGIN
 SELECT occurrence.id INTO STRICT primary_id FROM public.scheduled_message_occurrences occurrence WHERE occurrence.schedule_id=v_schedule_id AND occurrence.post_role='primary';
 SELECT id INTO STRICT child_id FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up';
 SELECT id INTO STRICT delivery_id FROM public.notification_deliveries WHERE scheduled_occurrence_id=primary_id AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery_id;
 snap:=public.begin_scheduled_delivery(delivery_id);
 IF snap IS NULL THEN RAISE EXCEPTION 'moc_app-created send-now did not enter delivery'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery_id,1,99101,NULL,false);
 UPDATE public.scheduled_message_occurrences SET send_on=clock_timestamp()-interval '5 minutes' WHERE id=primary_id;
 PERFORM public.prepare_scheduled_messages();
 SELECT id INTO STRICT delivery_id FROM public.notification_deliveries WHERE scheduled_occurrence_id=child_id AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery_id;
 snap:=public.begin_scheduled_delivery(delivery_id);
 IF snap IS NULL THEN RAISE EXCEPTION 'Follow-up was not released after the primary send'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery_id,1,99102,NULL,false);
END $$;

RESET ROLE;
SET LOCAL ROLE moc_app;
DO $$
DECLARE v_schedule_id uuid:=current_setting('moc.scheduled_v2_app_schedule')::uuid; primary_id uuid; child_id uuid; revision integer; first_stamp timestamptz; second_stamp timestamptz;
 actor uuid:=moc_private.actor_id(); forged_actor uuid:='20000000-0000-4000-8000-000000000002';
BEGIN
 SELECT occurrence.id INTO STRICT primary_id FROM public.scheduled_message_occurrences occurrence WHERE occurrence.schedule_id=v_schedule_id AND occurrence.post_role='primary';
 SELECT id INTO STRICT child_id FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up';
 SELECT occurrence.revision INTO revision FROM public.scheduled_message_occurrences occurrence WHERE occurrence.id=primary_id;
 BEGIN
  PERFORM public.respond_scheduled_attendance(forged_actor,primary_id,revision,'attending','09:15',NULL,NULL);
  RAISE EXCEPTION 'moc_app forged an attendance actor';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='moc_app forged an attendance actor' THEN RAISE; END IF; END;
 PERFORM set_config('moc.scheduled_v2_primary',primary_id::text,true);
 PERFORM set_config('moc.scheduled_v2_child',child_id::text,true);
 PERFORM set_config('moc.scheduled_v2_revision',revision::text,true);
END $$;

RESET ROLE;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000003',true);
DO $$
DECLARE primary_id uuid:=current_setting('moc.scheduled_v2_primary')::uuid; child_id uuid:=current_setting('moc.scheduled_v2_child')::uuid;
 revision integer:=current_setting('moc.scheduled_v2_revision')::integer; actor uuid:=moc_private.actor_id(); first_stamp timestamptz; second_stamp timestamptz;
BEGIN
 PERFORM public.respond_scheduled_attendance(actor,primary_id,revision,'not_attending',NULL,NULL,'Prior commitment');
 first_stamp:=public.check_in_scheduled_attendance(actor,child_id);
 second_stamp:=public.check_in_scheduled_attendance(actor,child_id);
 IF first_stamp IS NULL OR first_stamp IS DISTINCT FROM second_stamp THEN RAISE EXCEPTION 'moc_app check-in did not return a stable receipt timestamp'; END IF;
END $$;
ROLLBACK;
