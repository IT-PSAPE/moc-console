BEGIN;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
  set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
INSERT INTO public.requests (id,workspace_id,title,category,due_date,requested_by,who,what,when_text,where_text,why,how,notes,content)
SELECT '30000000-0000-4000-8000-000000000001',id,'Legacy request','video_production',now()+interval '1 day',
  'Public person','Who','What','When','Where','Why','How','Existing plain note',
  '<p>Existing <strong>formatted</strong> content</p><script>alert(1)</script>'
FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.request_comments (id,request_id,actor_id,body,created_at)
VALUES ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','Original comment','2026-01-01 10:00Z');
INSERT INTO public.requests (id,workspace_id,title,category,due_date,requested_by,who,what,when_text,where_text,why,how,notes,content)
SELECT '30000000-0000-4000-8000-000000000003',id,'Unicode legacy request','video_production',now()+interval '1 day',
 'Public person','Who','What','When','Where','Why','How',E'  Use <stage> then <camera>\n\tΔοκιμή  ',
 '["first","second\nthird","Αθήνα <literal>"]' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.notification_message_templates(workspace_id,scope,message_type,body)
SELECT id,'group','request.created','Custom {{title}}: {{notes}}' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.notification_message_templates(workspace_id,scope,message_type,body)
SELECT id,'group','booking.created','Custom booking {{title}}<blockquote>{{notes}}</blockquote>' FROM public.workspaces WHERE slug='default-workspace';
SET LOCAL ROLE moc_worker;
INSERT INTO public.equipment(id,workspace_id,name,serial_number,category,location,notes)
SELECT '70000000-0000-4000-8000-000000000001',id,'Legacy camera','LEGACY-CAM','camera','Store',E'  Use <stage> then <camera>\n\tΔοκιμή  ' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.bookings(id,workspace_id,title,booked_by,checked_out_at,expected_return_at,notes,created_at,updated_at)
SELECT '70000000-0000-4000-8000-000000000002',id,'Legacy booking','Borrower',now(),now()+interval '1 day',repeat('Long booking note <literal> ',1200),'2025-12-10 09:00Z','2026-01-10 09:00Z' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.venues(id,workspace_id,name) SELECT '70000000-0000-4000-8000-000000000003',id,'Legacy venue' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.venue_bookings(id,workspace_id,venue_id,tracking_code,title,requested_by,starts_at,ends_at,notes,created_at,updated_at)
SELECT '70000000-0000-4000-8000-000000000004',id,'70000000-0000-4000-8000-000000000003','VEN-LEGACY-NOTE','Legacy venue booking','Venue requester',now()+interval '1 day',now()+interval '1 day 1 hour',E'Venue notes\nKeep all original lines.','2025-12-11 09:00Z','2026-01-11 09:00Z' FROM public.workspaces WHERE slug='default-workspace';
COMMIT;
