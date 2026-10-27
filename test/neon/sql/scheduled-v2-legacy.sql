-- Legacy-shaped scheduled-message rows for the socket-only v2 migration test.
BEGIN;
SET LOCAL ROLE moc_worker;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
DO $$
DECLARE w uuid:=(SELECT id FROM public.workspaces WHERE slug='default-workspace');
BEGIN
 INSERT INTO public.scheduled_message_templates(id,workspace_id,name,message_type,body,fields,audience,require_arrival,attendance_groups)
 VALUES('51000000-0000-4000-8000-000000000001',w,'Unused legacy source','pre_attendance',
  '<b>{{title}}</b>'||E'\n'||'{{date}} {{time}}'||E'\n'||'{{instructions}}',
  '{"title":"Legacy <Title>","instructions":"Keep & stay"}'::jsonb,'{}',true,'[]');
 INSERT INTO public.scheduled_message_schedules(id,workspace_id,template_id,attendee_ids,group_chat_id,thread_id,starts_on,until_on,timezone,frequency,auto_send,expiry_hours,enabled,fields,body,message_type,audience,require_arrival,attendance_groups,send_time)
 VALUES('52000000-0000-4000-8000-000000000001',w,'51000000-0000-4000-8000-000000000001',
  ARRAY['20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid],
  '-1000000000001',42,current_date-2,current_date+5,'Africa/Johannesburg','daily',true,72,true,
  '{"title":"Legacy <Title>","instructions":"Keep & stay"}'::jsonb,
  '<b>{{title}}</b>'||E'\n'||'{{date}} {{time}}'||E'\n'||'{{instructions}}','pre_attendance','{}',true,'[]','11:00');
 INSERT INTO public.scheduled_message_occurrences(id,workspace_id,schedule_id,attendee_ids,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,state,revision,synced_revision,telegram_message_id,roster_frozen,attendance_groups)
 VALUES
  ('53000000-0000-4000-8000-000000000001',w,'52000000-0000-4000-8000-000000000001',
   ARRAY['20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid],
   current_date-15,('2025-09-15 11:00'::timestamp AT TIME ZONE 'Africa/Johannesburg'),
   ('2025-09-18 12:34'::timestamp AT TIME ZONE 'Africa/Johannesburg'),
   '{"title":"Legacy <Title>","instructions":"Keep & stay"}'::jsonb,
   '<b>{{title}}</b>'||E'\n'||'{{date}} {{time}}'||E'\n'||'{{instructions}}','pre_attendance','{}',true,'sent',4,4,880001,true,'[]'),
  ('53000000-0000-4000-8000-000000000002',w,'52000000-0000-4000-8000-000000000001',
   ARRAY['20000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid],
   current_date-1,clock_timestamp()-interval '1 hour',clock_timestamp()+interval '2 days',
   '{"title":"Legacy <Title>","instructions":"Keep & stay"}'::jsonb,
   '<b>{{title}}</b>'||E'\n'||'{{date}} {{time}}'||E'\n'||'{{instructions}}','pre_attendance','{}',true,'sent',5,5,880002,true,'[]'),
  ('53000000-0000-4000-8000-000000000003',w,'52000000-0000-4000-8000-000000000001',
   ARRAY['20000000-0000-4000-8000-000000000001'::uuid],
   current_date-20,clock_timestamp()-interval '10 days',clock_timestamp()-interval '7 days',
   '{"title":"Stale send","instructions":"Must not send"}'::jsonb,
   '<b>{{title}}</b>'||E'\n'||'{{date}} {{time}}'||E'\n'||'{{instructions}}','announcement','{}',false,'scheduled',1,0,NULL,false,'[]');
 INSERT INTO public.scheduled_message_responses(occurrence_id,user_id,name,status,arrival_time,acknowledged_revision,group_id)
 VALUES
  ('53000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Ada Admin','attending','10:30',4,NULL),
  ('53000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Eli Editor','not_attending',NULL,4,NULL),
  ('53000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Ada Admin','attending','09:15',5,NULL);
 INSERT INTO public.notification_deliveries(id,workspace_id,event_key,scope,destination_key,chat_id,thread_id,text,payload,status,scheduled_occurrence_id,scheduled_operation)
 VALUES
  ('54000000-0000-4000-8000-000000000001',w,'legacy-expired-send','group','scheduled:test','-1000000000001',42,'Scheduled message','{}','pending','53000000-0000-4000-8000-000000000003','send'),
  ('54000000-0000-4000-8000-000000000002',w,'legacy-expire-operation','group','scheduled:test','-1000000000001',42,'Scheduled message','{}','pending','53000000-0000-4000-8000-000000000001','expire');
END $$;
COMMIT;
