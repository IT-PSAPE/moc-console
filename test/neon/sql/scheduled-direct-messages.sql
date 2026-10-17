BEGIN;
\ir assert-rejected.sql
DO $$
DECLARE
 actor uuid := '20000000-0000-4000-8000-000000000002';
 unlinked uuid := '20000000-0000-4000-8000-000000000004';
 selected uuid := '20000000-0000-4000-8000-000000000006';
 not_selected uuid := '20000000-0000-4000-8000-000000000003';
 workspace uuid := (SELECT id FROM public.workspaces WHERE slug='default-workspace');
 schedule uuid; occurrence uuid; rev integer; delivery uuid; snapshot jsonb; roster jsonb;
 attendees jsonb;
BEGIN
 UPDATE public.workspace_users SET role_id=(SELECT id FROM public.roles WHERE name='admin')
 WHERE workspace_id='10000000-0000-4000-8000-000000000002' AND user_id=actor;
 attendees := jsonb_build_array(unlinked,selected);
 PERFORM pg_temp.assert_rejected(format(
  'SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,workspace,
  jsonb_build_object('groupChatId','-1000000000001','startsOn',current_date+1,'frequency','once','body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','pre_attendance','attendeeIds','[]'::jsonb)
 ),'Select at least one attendee');
 PERFORM pg_temp.assert_rejected(format(
  'SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,workspace,
  jsonb_build_object('groupChatId','-1000000000001','startsOn',current_date+1,'frequency','once','body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','pre_attendance','attendeeIds',jsonb_build_array(selected,selected))
 ),'Attendees cannot be duplicated');
 PERFORM pg_temp.assert_rejected(format(
  'SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,workspace,
  jsonb_build_object('groupChatId','-1000000000001','startsOn',current_date+1,'frequency','once','body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','pre_attendance','attendeeIds',jsonb_build_array('20000000-0000-4000-8000-000000000005'::uuid))
 ),'Every attendee must be a current workspace member');
 PERFORM pg_temp.assert_rejected(format(
  'SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,'10000000-0000-4000-8000-000000000002'::uuid,
  jsonb_build_object('groupChatId','-1000000000002','startsOn',current_date+1,'frequency','once','body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','pre_attendance','attendeeIds',jsonb_build_array(selected))
 ),'Every attendee must be a current workspace member');
 PERFORM pg_temp.assert_rejected(format(
  'SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,workspace,
  jsonb_build_object('groupChatId','-1000000000001','startsOn',current_date+1,'frequency','once','body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','invalid','attendeeIds',attendees)
 ),'Invalid message type');
 schedule := public.create_scheduled_schedule(actor,workspace,jsonb_build_object(
  'groupChatId','-1000000000001','startsOn',current_date+1,'frequency','once','expiryHours',48,'autoSend',false,
  'body','{{title}}','fields',jsonb_build_object('title','Direct'),'messageType','pre_attendance','requireArrival',true,
  'attendeeIds',attendees
 ));
 SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule;
 IF (SELECT template_id FROM public.scheduled_message_schedules WHERE id=schedule) IS NOT NULL THEN RAISE EXCEPTION 'Direct schedule unexpectedly references a template'; END IF;
 IF (SELECT attendee_ids FROM public.scheduled_message_schedules WHERE id=schedule) IS DISTINCT FROM ARRAY[unlinked,selected] OR (SELECT attendee_ids FROM public.scheduled_message_occurrences WHERE id=occurrence) IS DISTINCT FROM ARRAY[unlinked,selected] THEN RAISE EXCEPTION 'Explicit attendee ordering was not persisted'; END IF;
 PERFORM public.request_scheduled_send(actor,occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot := public.begin_scheduled_delivery(delivery);
 roster := snapshot->'responses';
 IF jsonb_array_length(roster)<>2 OR roster->0->>'user_id'<>unlinked::text OR roster->1->>'user_id'<>selected::text THEN RAISE EXCEPTION 'Direct roster omitted the unlinked member or changed attendee order'; END IF;
 PERFORM public.finish_scheduled_delivery(delivery,rev,99881);
 UPDATE public.notification_deliveries SET status='sent' WHERE id=delivery;
 PERFORM pg_temp.assert_rejected(format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''attending'')',not_selected,occurrence,rev),'not in this attendance roster');
 PERFORM public.respond_scheduled_attendance(unlinked,occurrence,rev,'attending','08:15');
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 PERFORM public.request_scheduled_resend(actor,occurrence,rev);
 SELECT revision INTO rev FROM public.scheduled_message_occurrences WHERE id=occurrence;
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='resend';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 snapshot := public.begin_scheduled_delivery(delivery);
 roster := snapshot->'responses';
 IF jsonb_array_length(roster)<>2 OR roster->0->>'user_id'<>unlinked::text OR roster->0->>'status'<>'attending' OR roster->0->>'arrival_time'<>'08:15' OR roster->1->>'user_id'<>selected::text THEN RAISE EXCEPTION 'Resend reordered the roster or lost a saved response'; END IF;
END $$;
ROLLBACK;
