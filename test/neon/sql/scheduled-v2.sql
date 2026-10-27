BEGIN;
DO $$ BEGIN
 IF (SELECT count(*) FROM moc_private.scheduled_message_v2_legacy_archive WHERE source_kind='template')<>1 THEN RAISE EXCEPTION 'Unused template source was not archived'; END IF;
 IF (SELECT count(*) FROM moc_private.scheduled_message_v2_legacy_archive WHERE source_kind='occurrence')<>3 THEN RAISE EXCEPTION 'Legacy occurrence sources were not archived'; END IF;
 IF has_table_privilege('moc_worker','moc_private.scheduled_message_v2_legacy_archive','SELECT') OR has_table_privilege('moc_app','moc_private.scheduled_message_v2_legacy_archive','SELECT') THEN RAISE EXCEPTION 'Runtime can read the legacy source archive'; END IF;
 IF moc_private.render_legacy_scheduled_body('<b>{{title}}</b>'||E'\n'||'{{instructions}}'||E'\n'||'<i>{{time}}</i>',
  '{"title":"","instructions":""}'::jsonb,NULL,'Africa/Johannesburg') IS DISTINCT FROM '' THEN RAISE EXCEPTION 'Legacy empty-token lines were not dropped like renderTemplate'; END IF;
 IF moc_private.render_legacy_scheduled_body('<b>{{title}}</b>'||E'\n\n\n'||'Keep',
  '{"title":"Hi"}'::jsonb,NULL,'Africa/Johannesburg') IS DISTINCT FROM ('<b>Hi</b>'||E'\n\n'||'Keep') THEN RAISE EXCEPTION 'Legacy blank-line collapse changed'; END IF;
 PERFORM moc_private.scheduled_validate_body('announcement','<b>Time {{time:12:34}}</b>');
 BEGIN
  PERFORM moc_private.scheduled_validate_body('announcement','<b data-time="{{time:12:34}}">Time</b>');
  RAISE EXCEPTION 'A token inside an HTML attribute was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A token inside an HTML attribute was accepted' THEN RAISE; END IF; END;
END $$;
SET LOCAL ROLE moc_worker;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
DO $$
DECLARE w uuid:=(SELECT id FROM public.workspaces WHERE slug='default-workspace');
 schedule uuid; primary_id uuid; child_id uuid; delivery uuid; revision integer; child_revision integer; snap jsonb; first_stamp timestamptz; second_stamp timestamptz; affected uuid[];
 actor uuid:='20000000-0000-4000-8000-000000000001'; local_start timestamp; local_expiry timestamp; expected_body text; until_date date;
BEGIN
 IF to_regclass('public.scheduled_message_templates') IS NOT NULL THEN RAISE EXCEPTION 'Legacy template table remains live'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_message_schedules' AND column_name IN ('template_id','auto_send','expiry_hours','fields','audience','require_arrival')) THEN RAISE EXCEPTION 'Legacy schedule fields remain live'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='scheduled_message_occurrences' AND column_name IN ('expires_at','fields','audience','require_arrival')) THEN RAISE EXCEPTION 'Legacy occurrence fields remain live'; END IF;
 IF (SELECT body FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000001') IS DISTINCT FROM
  ('<b>Legacy &lt;Title&gt;</b>'||E'\n'||'420918 12:34'||E'\n'||'Keep &amp; stay') THEN RAISE EXCEPTION 'Legacy body did not preserve exact old rendering: %',(SELECT body FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000001'); END IF;
 IF NOT (SELECT legacy_closed FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Expired sent row lost its Closed marker'; END IF;
 IF (SELECT legacy_closed FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Unexpired sent row was closed'; END IF;
 IF (SELECT state FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000003')<>'cancelled'
  OR (SELECT delivery_lease FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000003') IS NOT NULL THEN RAISE EXCEPTION 'Expired unsent occurrence was not cancelled cleanly'; END IF;
 IF (SELECT status FROM public.notification_deliveries WHERE id='54000000-0000-4000-8000-000000000001')<>'failed'
   OR (SELECT status FROM public.notification_deliveries WHERE id='54000000-0000-4000-8000-000000000002')<>'failed' THEN RAISE EXCEPTION 'Stale scheduled/expiry deliveries were not failed'; END IF;
 UPDATE public.notification_deliveries SET status='processing' WHERE id='54000000-0000-4000-8000-000000000002';
 snap:=public.begin_scheduled_delivery('54000000-0000-4000-8000-000000000002');
 IF snap IS NOT NULL OR (SELECT status FROM public.notification_deliveries WHERE id='54000000-0000-4000-8000-000000000002')<>'failed' THEN RAISE EXCEPTION 'Legacy expiry delivery was allowed to dispatch'; END IF;
 IF (SELECT count(*) FROM public.scheduled_message_responses WHERE occurrence_id='53000000-0000-4000-8000-000000000001')<>2 THEN RAISE EXCEPTION 'Legacy response rows were lost'; END IF;
 IF (SELECT count(*) FROM public.scheduled_message_responses WHERE occurrence_id='53000000-0000-4000-8000-000000000001' AND status='not_attending')<>1 THEN RAISE EXCEPTION 'Legacy attendance response changed'; END IF;
 IF (SELECT message_type FROM public.scheduled_message_occurrences WHERE id='53000000-0000-4000-8000-000000000002')<>'attendance' THEN RAISE EXCEPTION 'Legacy pre-attendance type was not migrated'; END IF;
 BEGIN
  PERFORM public.respond_scheduled_attendance(actor,'53000000-0000-4000-8000-000000000001',4,'attending','09:15',NULL,NULL);
  RAISE EXCEPTION 'A legacy-closed attendance post accepted a new response';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A legacy-closed attendance post accepted a new response' THEN RAISE; END IF; END;
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id='53000000-0000-4000-8000-000000000002';
 PERFORM public.respond_scheduled_attendance(actor,'53000000-0000-4000-8000-000000000002',revision,'attending','09:15',NULL,NULL);

 -- Old recurring schedules keep their archived source until explicitly edited;
 -- the migration does not create a surprise attendance follow-up.
 PERFORM public.materialize_scheduled_messages('52000000-0000-4000-8000-000000000001');
 SELECT o.id,o.send_on AT TIME ZONE s.timezone INTO STRICT primary_id,local_expiry
  FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id
  WHERE o.schedule_id='52000000-0000-4000-8000-000000000001' AND o.post_role='primary' AND o.occurrence_on=current_date+3;
 IF EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up') THEN RAISE EXCEPTION 'Legacy attendance schedule generated an unrequested follow-up'; END IF;
 local_expiry:=local_expiry+interval '72 hours';
 expected_body:='<b>Legacy &lt;Title&gt;</b>'||E'\n'||lpad((extract(year FROM local_expiry)::integer-1983)::text,2,'0')||to_char(local_expiry,'MMDD HH24:MI')||E'\n'||'Keep &amp; stay';
 IF (SELECT body FROM public.scheduled_message_occurrences WHERE id=primary_id) IS DISTINCT FROM expected_body THEN RAISE EXCEPTION 'Legacy recurrence did not preserve prior literal rendering: %', (SELECT body FROM public.scheduled_message_occurrences WHERE id=primary_id); END IF;
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id=primary_id;
 PERFORM public.change_scheduled_occurrence(actor,primary_id,revision,'followUpMinutes','60','occurrence');
 SELECT id INTO STRICT child_id FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up';
 IF (SELECT send_on FROM public.scheduled_message_occurrences WHERE id=child_id) IS DISTINCT FROM (SELECT send_on+interval '60 minutes' FROM public.scheduled_message_occurrences WHERE id=primary_id) THEN RAISE EXCEPTION 'Explicit legacy follow-up offset was not anchored to primary send time'; END IF;
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id=primary_id;
 PERFORM public.change_scheduled_occurrence(actor,primary_id,revision,'body','Replacement legacy series body','series');
 IF (SELECT legacy_source_active FROM public.scheduled_message_schedules WHERE id='52000000-0000-4000-8000-000000000001')
  OR (SELECT body FROM public.scheduled_message_occurrences WHERE id=primary_id) IS DISTINCT FROM 'Replacement legacy series body' THEN RAISE EXCEPTION 'Whole-series body edit did not retire and replace the archived legacy source'; END IF;

 -- A send-now announcement is explicitly queued, with no expiry path.
 schedule:=public.create_scheduled_schedule(actor,w,jsonb_build_object(
  'messageType','announcement','body','<b>Now</b>','attendeeIds','[]'::jsonb,'attendanceGroups','[]'::jsonb,
  'groupChatId','-1000000000001','sendNow',true));
 IF NOT EXISTS(SELECT 1 FROM public.notification_deliveries d JOIN public.scheduled_message_occurrences o ON o.id=d.scheduled_occurrence_id
  WHERE o.schedule_id=schedule AND o.post_role='primary' AND d.scheduled_operation='send' AND d.status='pending' AND d.payload->>'manual'='true') THEN
  RAISE EXCEPTION 'Send-now primary was not explicitly queued';
 END IF;

 -- A scheduled attendance follow-up survives the inclusive final primary date.
 local_start:=((clock_timestamp() AT TIME ZONE public.workspace_timezone(w))::date+1)+time '23:59';
 until_date:=local_start::date;
 schedule:=public.create_scheduled_schedule(actor,w,jsonb_build_object(
  'messageType','attendance','body','Gather {{date:2026-10-27}} at {{time:23:30}}','attendeeIds',jsonb_build_array(actor::text),
  'attendanceGroups','[]'::jsonb,'groupChatId','-1000000000001','startsOn',to_char(local_start,'YYYY-MM-DD"T"HH24:MI:SS'),
  'frequency','once','untilOn',until_date::text,'followUpMinutes',120));
 IF (SELECT timezone FROM public.scheduled_message_schedules WHERE id=schedule) IS DISTINCT FROM public.workspace_timezone(w) THEN RAISE EXCEPTION 'New schedule did not use workspace timezone'; END IF;
  SELECT id INTO STRICT primary_id FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND post_role='primary';
  SELECT id INTO STRICT child_id FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up';
 IF (SELECT (send_on AT TIME ZONE timezone)::date FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id WHERE o.id=child_id)<=until_date THEN
  RAISE EXCEPTION 'Follow-up did not survive final primary date';
 END IF;

 -- Exercise queue gating and the linked primary/child delivery contract without Telegram I/O.
 schedule:=public.create_scheduled_schedule(actor,w,jsonb_build_object(
  'messageType','attendance','body','Today','attendeeIds',jsonb_build_array(actor::text),
  'attendanceGroups','[]'::jsonb,'groupChatId','-1000000000001','sendNow',true,'followUpMinutes',1));
 SELECT id INTO STRICT primary_id FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND post_role='primary';
 SELECT id INTO STRICT child_id FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=primary_id AND post_role='follow_up';
 IF EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=child_id AND scheduled_operation='send') THEN RAISE EXCEPTION 'Follow-up queued before primary succeeded'; END IF;
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=primary_id AND scheduled_operation='send' ORDER BY created_at DESC LIMIT 1;
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snap:=public.begin_scheduled_delivery(delivery);
 IF snap->>'workspaceTimezone' IS NULL OR snap#>>'{occurrence,post_role}'<>'primary' THEN RAISE EXCEPTION 'Primary delivery snapshot contract is incomplete'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,1,99001,NULL,false);
 BEGIN
  PERFORM public.request_scheduled_send(actor,child_id);
  RAISE EXCEPTION 'A follow-up accepted a manual send request';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A follow-up accepted a manual send request' THEN RAISE; END IF; END;
 SELECT occurrence.revision INTO child_revision FROM public.scheduled_message_occurrences occurrence WHERE occurrence.id=child_id;
 BEGIN
  PERFORM public.change_scheduled_occurrence(actor,child_id,child_revision,'sendOn',to_char(clock_timestamp()+interval '3 hours','YYYY-MM-DD"T"HH24:MI:SSOF'),'occurrence');
  RAISE EXCEPTION 'A follow-up accepted a direct send-time edit';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A follow-up accepted a direct send-time edit' THEN RAISE; END IF; END;
 UPDATE public.scheduled_message_occurrences SET send_on=clock_timestamp()-interval '5 minutes' WHERE id=primary_id;
 PERFORM public.materialize_scheduled_messages(schedule);
 PERFORM public.prepare_scheduled_messages();
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=child_id AND scheduled_operation='send' ORDER BY created_at DESC LIMIT 1;
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snap:=public.begin_scheduled_delivery(delivery);
 IF snap#>>'{occurrence,post_role}'<>'follow_up' OR jsonb_array_length(snap->'responses')<>1 THEN RAISE EXCEPTION 'Follow-up did not read canonical primary roster'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,1,99002,NULL,false);

 -- A due scheduled primary is sent automatically; no optional auto-send flag exists.
 local_start:=(clock_timestamp() AT TIME ZONE public.workspace_timezone(w))-interval '5 minutes';
 schedule:=public.create_scheduled_schedule(actor,w,jsonb_build_object(
  'messageType','announcement','body','Automatic','attendeeIds','[]'::jsonb,'attendanceGroups','[]'::jsonb,
  'groupChatId','-1000000000001','startsOn',to_char(local_start,'YYYY-MM-DD"T"HH24:MI:SS'),'frequency','once'));
 PERFORM public.prepare_scheduled_messages();
 IF NOT EXISTS(SELECT 1 FROM public.notification_deliveries d JOIN public.scheduled_message_occurrences o ON o.id=d.scheduled_occurrence_id
   WHERE o.schedule_id=schedule AND o.post_role='primary' AND d.scheduled_operation='send' AND d.status='pending') THEN RAISE EXCEPTION 'Due scheduled primary was not queued automatically'; END IF;

 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id=primary_id;
 BEGIN
  PERFORM public.respond_scheduled_attendance(actor,primary_id,revision,'attending',NULL,NULL,NULL);
  RAISE EXCEPTION 'An attendance intent without expected arrival was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='An attendance intent without expected arrival was accepted' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.respond_scheduled_attendance(actor,primary_id,revision,'not_attending',NULL,NULL,'  ');
  RAISE EXCEPTION 'A blank decline reason was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A blank decline reason was accepted' THEN RAISE; END IF; END;
 PERFORM public.respond_scheduled_attendance(actor,primary_id,revision,'not_attending',NULL,NULL,'A prior commitment');
 IF (SELECT decline_reason FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor) IS DISTINCT FROM 'A prior commitment' THEN RAISE EXCEPTION 'Decline reason was not stored on the canonical response'; END IF;
 SELECT checked_in_at INTO first_stamp FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor;
 IF first_stamp IS NOT NULL THEN RAISE EXCEPTION 'Decline unexpectedly set actual check-in'; END IF;
 first_stamp:=public.check_in_scheduled_attendance(actor,child_id);
 second_stamp:=public.check_in_scheduled_attendance(actor,child_id);
 IF first_stamp IS DISTINCT FROM second_stamp THEN RAISE EXCEPTION 'Repeated check-in changed first receipt time'; END IF;
 SELECT checked_in_at INTO second_stamp FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor;
 IF second_stamp IS DISTINCT FROM first_stamp THEN RAISE EXCEPTION 'Check-in timestamp was not persisted on canonical primary response'; END IF;
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id=primary_id;
 PERFORM public.respond_scheduled_attendance(actor,primary_id,revision,'attending','09:15',NULL,NULL);
 IF (SELECT checked_in_at FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor) IS DISTINCT FROM first_stamp THEN RAISE EXCEPTION 'RSVP edit overwrote actual check-in time'; END IF;
 IF EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=child_id) THEN RAISE EXCEPTION 'Follow-up duplicated canonical response rows'; END IF;
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE o.id=primary_id;
 PERFORM public.change_scheduled_occurrence(actor,primary_id,revision,'body','Updated body','occurrence');
 IF (SELECT body FROM public.scheduled_message_occurrences WHERE id=primary_id) IS DISTINCT FROM 'Updated body'
  OR (SELECT body FROM public.scheduled_message_occurrences WHERE id=child_id) IS DISTINCT FROM 'Updated body' THEN RAISE EXCEPTION 'Body edit did not cover the linked pair'; END IF;
 SELECT o.revision INTO child_revision FROM public.scheduled_message_occurrences o WHERE o.id=child_id;
 PERFORM public.request_scheduled_resend(actor,child_id,child_revision);
 IF (SELECT checked_in_at FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor) IS DISTINCT FROM first_stamp
  OR (SELECT parent_occurrence_id FROM public.scheduled_message_occurrences WHERE id=child_id) IS DISTINCT FROM primary_id THEN RAISE EXCEPTION 'Resend changed canonical check-in or linked child identity'; END IF;
 SELECT o.revision INTO child_revision FROM public.scheduled_message_occurrences o WHERE o.id=child_id;
 affected:=public.delete_scheduled_occurrence(actor,child_id,child_revision,'occurrence');
 IF cardinality(affected)<>2 OR (SELECT count(*) FROM public.scheduled_message_occurrences WHERE id=ANY(affected) AND state='cancelled')<>2
  OR (SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id=ANY(affected) AND scheduled_operation='delete' AND status='pending')<>2 THEN RAISE EXCEPTION 'Deleting one linked occurrence did not cancel and delete the pair'; END IF;
 IF (SELECT checked_in_at FROM public.scheduled_message_responses WHERE occurrence_id=primary_id AND user_id=actor) IS DISTINCT FROM first_stamp THEN RAISE EXCEPTION 'Pair cancellation removed the canonical response'; END IF;
 BEGIN
  PERFORM public.check_in_scheduled_attendance(actor,child_id);
  RAISE EXCEPTION 'A cancelled follow-up accepted check-in';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='A cancelled follow-up accepted check-in' THEN RAISE; END IF; END;

 -- New writes cannot revive any retired field names, nor create invalid tokens.
 BEGIN
  PERFORM public.create_scheduled_schedule(actor,w,'{"messageType":"announcement","body":"x","groupChatId":"-1000000000001","sendNow":true,"expiresAt":"2027-01-01T00:00:00Z"}'::jsonb);
  RAISE EXCEPTION 'Removed expiry input was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Removed expiry input was accepted' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.create_scheduled_schedule(actor,w,'{"messageType":"announcement","body":"{{date:2026-02-30}}","groupChatId":"-1000000000001","sendNow":true}'::jsonb);
  RAISE EXCEPTION 'Invalid typed date was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Invalid typed date was accepted' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.create_scheduled_schedule(actor,w,'{"messageType":"announcement","body":"x","groupChatId":"-1000000000001","sendNow":true,"timezone":"UTC"}'::jsonb);
  RAISE EXCEPTION 'Client timezone override was accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='Client timezone override was accepted' THEN RAISE; END IF; END;
END $$;
ROLLBACK;
