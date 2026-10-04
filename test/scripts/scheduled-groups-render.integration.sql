CREATE TEMP TABLE groups_render_fixture(template_id uuid, schedule_id uuid, occurrence_id uuid, delivery_id uuid);

DO $$
DECLARE
  actor uuid := '20000000-0000-4000-8000-000000000002';
  attendee uuid := '20000000-0000-4000-8000-000000000003';
  workspace uuid := (SELECT id FROM public.workspaces WHERE slug = 'default-workspace');
  audience uuid[];
  groups jsonb := '[{"id":"00000000-0000-4000-8000-000000000011","label":"North side"},{"id":"00000000-0000-4000-8000-000000000012","label":"South side"}]';
  template uuid;
  schedule uuid;
  occurrence uuid;
  delivery uuid;
  rev integer;
BEGIN
  SELECT ARRAY[id] INTO audience FROM public.workspace_member_types WHERE workspace_id=workspace AND is_default;
  template := public.save_scheduled_template(actor,workspace,jsonb_build_object(
    'name','Renderer bridge','messageType','pre_attendance','body','<b>{{title}}</b>',
    'fields',jsonb_build_object('title','Sunday service'),'audience',to_jsonb(audience),
    'requireArrival',true,'attendanceGroups',groups));
  schedule := public.create_scheduled_schedule(actor,workspace,jsonb_build_object(
    'templateId',template,'groupChatId','-1000000000001','threadId',42,
    'startsOn',current_date,'frequency','once','timezone','Africa/Johannesburg',
    'expiryHours',72,'autoSend',false));
  SELECT id,revision INTO STRICT occurrence,rev FROM public.scheduled_message_occurrences WHERE schedule_id=schedule;
  PERFORM public.request_scheduled_send(actor,occurrence);
  SELECT id INTO STRICT delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='send';
  UPDATE public.notification_deliveries SET status='processing' WHERE id=delivery;
  PERFORM public.begin_scheduled_delivery(delivery);
  PERFORM public.finish_scheduled_delivery(delivery,rev,77441);

  SELECT o.revision INTO rev FROM public.scheduled_message_occurrences o WHERE o.id=occurrence;
  PERFORM public.respond_scheduled_attendance(attendee,occurrence,rev,'attending','09:15','00000000-0000-4000-8000-000000000011');
  SELECT o.revision INTO rev FROM public.scheduled_message_occurrences o WHERE o.id=occurrence;
  PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'attendanceGroups',
    '[{"id":"00000000-0000-4000-8000-000000000011","label":"North Wing"},{"id":"00000000-0000-4000-8000-000000000012","label":"South side"}]','occurrence');
  SELECT o.revision INTO rev FROM public.scheduled_message_occurrences o WHERE o.id=occurrence;
  PERFORM public.change_scheduled_occurrence(actor,occurrence,rev,'title','Updated service','occurrence');
  INSERT INTO groups_render_fixture VALUES(template,schedule,occurrence,delivery);
END $$;

SELECT jsonb_build_object(
  'input',jsonb_build_object(
    'id',o.id::text,'messageType',o.message_type,'body',o.body,'fields',o.fields,
    'requireArrival',o.require_arrival,'attendanceGroups',o.attendance_groups),
  'responses',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'name',r.name,'status',r.status,'arrivalTime',r.arrival_time,'groupId',r.group_id
  ) ORDER BY r.name) FROM public.scheduled_message_responses r WHERE r.occurrence_id=o.id),'[]'::jsonb),
  'telegramMessageId',o.telegram_message_id
)
FROM groups_render_fixture f
JOIN public.scheduled_message_occurrences o ON o.id=f.occurrence_id;
