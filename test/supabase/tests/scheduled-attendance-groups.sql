BEGIN;
\ir assert-rejected.sql
DO $$
DECLARE actor uuid:='20000000-0000-4000-8000-000000000002'; viewer uuid:='20000000-0000-4000-8000-000000000003'; workspace uuid:='10000000-0000-4000-8000-000000000001'; audience uuid[]; template uuid; schedule uuid; occurrence uuid; rev integer; delivery uuid; next_occurrence uuid; future_occurrence uuid; oneoff_template uuid; oneoff_schedule uuid; oneoff_occurrence uuid;
 groups jsonb := '[{"id":"00000000-0000-4000-8000-000000000011","label":"North"},{"id":"00000000-0000-4000-8000-000000000012","label":"South"}]';
BEGIN
 SELECT ARRAY[id] INTO audience FROM public.workspace_member_types WHERE workspace_id=workspace AND is_default;
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)','[{"id":"bad","label":"North"},{"id":"00000000-0000-4000-8000-000000000012","label":"South"}]'),'UUID');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)','[{"id":"00000000-0000-4000-8000-000000000011","label":4},{"id":"00000000-0000-4000-8000-000000000012","label":"South"}]'),'label must be text');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)',jsonb_build_array(jsonb_build_object('id','00000000-0000-4000-8000-000000000011','label',E'North\nside'),jsonb_build_object('id','00000000-0000-4000-8000-000000000012','label','South'))::text),'1 to 40');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)','[{"id":"00000000-0000-4000-8000-000000000011","label":"   "},{"id":"00000000-0000-4000-8000-000000000012","label":"South"}]'),'trimmed');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)',(SELECT jsonb_agg(jsonb_build_object('id',format('00000000-0000-4000-8000-%s',lpad(n::text,12,'0')),'label','Group '||n)) FROM generate_series(1,9) n)),'2 to 8');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''announcement'',%L::jsonb)',groups),'pre_attendance');
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_groups(''pre_attendance'',%L::jsonb)','[{"id":"00000000-0000-4000-8000-000000000021","label":"North"},{"id":"00000000-0000-4000-8000-000000000022","label":"north"}]'),'unique');
 template:=public.save_scheduled_template(actor,workspace,jsonb_build_object('name','Groups','messageType','pre_attendance','body','{{title}}','fields',jsonb_build_object('title','Service'),'audience',to_jsonb(audience),'attendanceGroups',groups));
 IF (SELECT attendance_groups FROM public.scheduled_message_templates WHERE id=template)<>groups THEN RAISE EXCEPTION 'Template groups not saved'; END IF;
 schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',current_date,'frequency','daily','expiryHours',72,'autoSend',false));
 SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date;
 IF (SELECT attendance_groups FROM public.scheduled_message_occurrences WHERE id=occurrence)<>groups THEN RAISE EXCEPTION 'Materialized groups differ'; END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,1,''attendanceGroups'',%L)',viewer,occurrence,groups::text),'Not authorised');
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''attending'',NULL,NULL)',viewer,occurrence,rev),'closed');
 PERFORM public.request_scheduled_send(actor,occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,1,77441);
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,1,''attending'',NULL,%L)', '20000000-0000-4000-8000-000000000004',occurrence,'00000000-0000-4000-8000-000000000011'),'roster');
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''attending'',NULL,NULL)',viewer,occurrence,rev),'group');
 PERFORM public.respond_scheduled_attendance(viewer,occurrence,rev,'attending','09:15','00000000-0000-4000-8000-000000000011');
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND user_id=viewer AND group_id='00000000-0000-4000-8000-000000000011' AND arrival_time='09:15') THEN RAISE EXCEPTION 'Group and attendance were not saved atomically'; END IF;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''attending'',''09:15'',''forged'')',viewer,occurrence,rev),'group');
 PERFORM public.respond_scheduled_attendance(viewer,occurrence,rev,'not_attending',NULL,NULL);
 IF EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND user_id=viewer AND (group_id IS NOT NULL OR arrival_time IS NOT NULL)) THEN RAISE EXCEPTION 'Declining must clear group and time'; END IF;
 -- Removing a referenced group fails the entire occurrence-scope update.
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM public.respond_scheduled_attendance(viewer,occurrence,rev,'attending','09:15','00000000-0000-4000-8000-000000000011');
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'attendanceGroups','[{"id":"00000000-0000-4000-8000-000000000011","label":"North side"},{"id":"00000000-0000-4000-8000-000000000012","label":"South side"}]','occurrence');
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND user_id=viewer AND status='attending' AND group_id='00000000-0000-4000-8000-000000000011' AND arrival_time='09:15') THEN RAISE EXCEPTION 'Renaming groups must retain response status, group ID and time'; END IF;
 SELECT id INTO STRICT next_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+1;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''attendanceGroups'',''[]'',''future'')',actor,occurrence,rev),'used');
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'attendanceGroups','[{"id":"00000000-0000-4000-8000-000000000011","label":"Future north"},{"id":"00000000-0000-4000-8000-000000000012","label":"Future south"}]','future');
 IF (SELECT attendance_groups->0->>'label' FROM public.scheduled_message_occurrences WHERE id=next_occurrence)<>'Future north' THEN RAISE EXCEPTION 'Future group patch did not update the next occurrence'; END IF;
 -- Re-materialization beyond the normal +32 day horizon must apply the stored patch.
 UPDATE public.scheduled_message_schedules SET frequency='once',starts_on=current_date+40 WHERE id=schedule;
 PERFORM public.materialize_scheduled_messages(schedule);
 SELECT id INTO STRICT future_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+40;
 IF (SELECT attendance_groups->0->>'label' FROM public.scheduled_message_occurrences WHERE id=future_occurrence)<>'Future north' THEN RAISE EXCEPTION 'Future group patch was not applied beyond day 32'; END IF;
 -- A newly sent recurrence gets a fresh awaiting roster with no preassigned group.
 PERFORM public.request_scheduled_send(actor,next_occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=next_occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,1,88442);
 IF EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=next_occurrence AND (status<>'awaiting' OR group_id IS NOT NULL)) THEN RAISE EXCEPTION 'New occurrence roster must start awaiting with no group assignment'; END IF;
 -- Series-wide removal also fails atomically while the selected group is live.
 UPDATE public.scheduled_message_schedules SET frequency='daily',starts_on=current_date WHERE id=schedule;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''attendanceGroups'',''[]'',''series'')',actor,occurrence,rev),'used');
 PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'attendanceGroups','[{"id":"00000000-0000-4000-8000-000000000011","label":"Series north"},{"id":"00000000-0000-4000-8000-000000000012","label":"Series south"}]','series');
 IF (SELECT attendance_groups->0->>'label' FROM public.scheduled_message_schedules WHERE id=schedule)<>'Series north' OR (SELECT attendance_groups->0->>'label' FROM public.scheduled_message_occurrences WHERE id=next_occurrence)<>'Series north' THEN RAISE EXCEPTION 'Series group edit did not update schedule and existing occurrence snapshots'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND user_id=viewer AND status='attending' AND group_id='00000000-0000-4000-8000-000000000011' AND arrival_time='09:15') THEN RAISE EXCEPTION 'Series group edit changed an existing response'; END IF;
 -- Declining an ungrouped occurrence with an extraneous group is rejected.
 UPDATE public.scheduled_message_occurrences SET attendance_groups='[]'::jsonb WHERE id=next_occurrence;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=next_occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''not_attending'',NULL,%L)',viewer,next_occurrence,rev,'00000000-0000-4000-8000-000000000011'),'no attendance groups');
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=next_occurrence AND user_id=viewer AND status='awaiting' AND group_id IS NULL) THEN RAISE EXCEPTION 'Rejected ungrouped decline changed the response'; END IF;
 -- One-off grouped schedules snapshot and deliver group choices too.
 oneoff_template:=public.save_scheduled_template(actor,workspace,jsonb_build_object('name','One-off groups','messageType','pre_attendance','body','{{title}}','fields',jsonb_build_object('title','One-off'),'audience',to_jsonb(audience),'attendanceGroups',groups));
 oneoff_schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',oneoff_template,'groupChatId','-1000000000001','startsOn',current_date+5,'frequency','once','expiryHours',72,'autoSend',false));
 SELECT id INTO STRICT oneoff_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=oneoff_schedule AND occurrence_on=current_date+5;
 IF (SELECT attendance_groups FROM public.scheduled_message_occurrences WHERE id=oneoff_occurrence)<>groups THEN RAISE EXCEPTION 'One-off occurrence lost its group snapshot'; END IF;
 PERFORM public.request_scheduled_send(actor,oneoff_occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=oneoff_occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,1,99551);
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=oneoff_occurrence;
 PERFORM public.respond_scheduled_attendance(viewer,oneoff_occurrence,rev,'attending',NULL,'00000000-0000-4000-8000-000000000012');
 -- An expired sent occurrence cannot accept a response.
 UPDATE public.scheduled_message_occurrences SET expires_at=clock_timestamp()-interval '1 second' WHERE id=occurrence;
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''attending'',NULL,%L)',viewer,occurrence,rev,'00000000-0000-4000-8000-000000000011'),'closed');
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''attendanceGroups'',''[]'',''occurrence'')',actor,occurrence,rev),'no longer editable');
 IF (SELECT telegram_message_id FROM public.scheduled_message_occurrences WHERE id=occurrence)<>77441 THEN RAISE EXCEPTION 'Group edit changed Telegram identity'; END IF;
END $$;
ROLLBACK;
