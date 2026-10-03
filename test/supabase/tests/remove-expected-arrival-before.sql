-- Legacy fixtures are intentionally created before the field-retirement migration.
DO $$
DECLARE
 actor uuid := '20000000-0000-4000-8000-000000000002';
 workspace uuid := '10000000-0000-4000-8000-000000000001';
 template uuid; schedule uuid; occurrence uuid; delivery uuid; revision integer;
 audience uuid[];
BEGIN
 SELECT ARRAY[id] INTO audience FROM public.workspace_member_types WHERE workspace_id=workspace AND is_default;
 template := public.save_scheduled_template(actor,workspace,jsonb_build_object('name','Legacy arrival migration','messageType','pre_attendance',
  'body',E'<b>{{title}}</b>\n{{instructions}}\nPlease arrive by {{expectedArrival}}.',
  'fields',jsonb_build_object('title','Morning','instructions','Meet at the entrance','expectedArrival','08:00'),'audience',audience,'requireArrival',true));
 schedule := public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001',
  'startsOn',current_date,'frequency','daily','autoSend',false,'expiryHours',72));
 SELECT id INTO STRICT occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date;
 PERFORM public.request_scheduled_send(actor,occurrence);
 SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='send';
 UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
 PERFORM public.begin_scheduled_delivery(delivery);
 PERFORM public.finish_scheduled_delivery(delivery,1,99123);
 PERFORM public.respond_scheduled_attendance('20000000-0000-4000-8000-000000000003',occurrence,1,'attending','09:15');
 SELECT id,scheduled_message_occurrences.revision INTO occurrence,revision FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+1;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,revision,'expectedArrival','07:30','future');
 SELECT id,scheduled_message_occurrences.revision INTO occurrence,revision FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+2;
 PERFORM public.change_scheduled_occurrence(actor,occurrence,revision,'instructions','Use the side entrance','future');
 INSERT INTO public.scheduled_message_series_changes(schedule_id,effective_on,field,value) VALUES(schedule,current_date+40,'expectedArrival','06:00');
 INSERT INTO public.scheduled_message_sessions(user_id,telegram_user_id,workspace_id,chat_id,kind,data)
 VALUES(actor,'migration-admin',workspace,'-1000000000001','admin','{"stage":"confirm","field":"expectedArrival","value":"07:00"}'),
 ('20000000-0000-4000-8000-000000000003','migration-attendee',workspace,'-1000000000001','attendance','{"stage":"input"}');
 PERFORM public.save_scheduled_template(actor,workspace,jsonb_build_object('name','Custom legacy arrival migration','messageType','pre_attendance',
  'body',E'{{title}}\n{{instructions}}\nDoors open: {{ expectedArrival }}',
  'fields',jsonb_build_object('title','Evening','instructions','Use the main door','expectedArrival','18:00'),'audience',audience));
END $$;
