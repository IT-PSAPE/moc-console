BEGIN;
SET LOCAL ROLE moc_worker;
DO $$
DECLARE actor uuid:='20000000-0000-4000-8000-000000000001'; w uuid:=(SELECT id FROM public.workspaces WHERE slug='default-workspace');
 s uuid; p uuid; c uuid; delivery uuid; revision integer;
BEGIN
 PERFORM set_config('moc.user_id',actor::text,true);
 PERFORM set_config('moc.workspace_id',w::text,true);
 s:=public.create_scheduled_schedule(actor,w,jsonb_build_object('messageType','attendance','body','<b>Bridge &amp; service</b>'||E'\n'||'{{date:2026-10-28}} {{time:14:15}}','groupChatId','-1000000000001','threadId',42,'attendeeIds',jsonb_build_array(actor),'followUpMinutes',60,'sendNow',true));
 SELECT id INTO STRICT p FROM public.scheduled_message_occurrences WHERE schedule_id=s AND post_role='primary';
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=p AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE id=p;
 PERFORM public.finish_scheduled_delivery(delivery,revision,991001,NULL,false);
 PERFORM public.respond_scheduled_attendance(actor,p,revision,'attending','14:15',NULL,NULL);
 SELECT id INTO STRICT c FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=p;
 UPDATE public.scheduled_message_occurrences SET send_on=clock_timestamp()-interval '2 hours' WHERE id=p;
 PERFORM public.prepare_scheduled_messages();
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=c AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 SELECT o.revision INTO revision FROM public.scheduled_message_occurrences o WHERE id=c;
 PERFORM public.finish_scheduled_delivery(delivery,revision,991002,NULL,false);
 PERFORM public.check_in_scheduled_attendance(actor,c);
 CREATE TEMP TABLE render_bridge_posts AS SELECT id FROM public.scheduled_message_occurrences WHERE id IN (p,c);
END $$;
RESET ROLE;
SELECT jsonb_build_object(
 'posts',(SELECT jsonb_agg(jsonb_build_object('occurrence',to_jsonb(o),'timezone',public.workspace_timezone(o.workspace_id),'responses',
  (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.name) FROM public.scheduled_message_responses r WHERE r.occurrence_id=coalesce(o.parent_occurrence_id,o.id))))
  FROM public.scheduled_message_occurrences o JOIN render_bridge_posts p ON p.id=o.id),
 'legacy',(SELECT jsonb_agg(jsonb_build_object('source',a.data,'body',o.body,'timezone',s.timezone))
  FROM moc_private.scheduled_message_v2_legacy_archive a JOIN public.scheduled_message_occurrences o ON o.id::text=a.source_id
  JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id WHERE a.source_kind='occurrence')
);
ROLLBACK;
