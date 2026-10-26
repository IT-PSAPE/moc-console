\ir assert-rejected.sql
BEGIN;
SET LOCAL ROLE moc_worker;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
INSERT INTO public.requests(id,workspace_id,title,category,due_date,requested_by,who,what,when_text,where_text,why,how)
SELECT '30000000-0000-4000-8000-000000000002',id,'Other request','video_production',now(),'Public person','Who','What','When','Where','Why','How'
FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.equipment(id,workspace_id,name,serial_number,category,location)
SELECT '50000000-0000-4000-8000-000000000001',id,'Camera','CAM-1','camera','Studio' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.bookings(id,workspace_id,title,booked_by,checked_out_at,expected_return_at,request_id)
SELECT '50000000-0000-4000-8000-000000000002',id,'Camera booking','Public person',now(),now()+interval '1 day','30000000-0000-4000-8000-000000000001'
FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.booking_items(booking_id,equipment_id) VALUES ('50000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001');
UPDATE public.bookings SET request_id='30000000-0000-4000-8000-000000000002' WHERE id='50000000-0000-4000-8000-000000000002';
INSERT INTO public.checklists(id,workspace_id,name) SELECT '50000000-0000-4000-8000-000000000003',id,'Checklist' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.checklist_items(id,checklist_id,label,sort_order) VALUES ('50000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000003','Set up',0);
INSERT INTO public.checklist_item_assignees(checklist_item_id,user_id) VALUES ('50000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002');
UPDATE public.checklist_items SET checked=true,label='Set up camera' WHERE id='50000000-0000-4000-8000-000000000004';
INSERT INTO public.broadcasts(id,workspace_id,created_by,title,slug,kind)
SELECT '50000000-0000-4000-8000-000000000005',id,'20000000-0000-4000-8000-000000000001','Broadcast','discussion-test','audio' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.broadcast_items(broadcast_id,title,sort_order,storage_path,public_url,mime_type,file_size_bytes)
VALUES ('50000000-0000-4000-8000-000000000005','Song',0,'PRIVATE-STORAGE-PATH','SECRET-URL','audio/mpeg',123);
INSERT INTO public.streams(id,workspace_id,youtube_broadcast_id,youtube_stream_id,title,stream_key,created_by)
SELECT '50000000-0000-4000-8000-000000000006',id,'BROADCAST','STREAM','Stream','SECRET-STREAM-KEY','20000000-0000-4000-8000-000000000001' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.venues(id,workspace_id,name) SELECT '50000000-0000-4000-8000-000000000007',id,'Main venue' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.venue_bookings(id,workspace_id,venue_id,tracking_code,title,requested_by,starts_at,ends_at)
SELECT '50000000-0000-4000-8000-000000000008',id,'50000000-0000-4000-8000-000000000007','VEN-DISCUSSION','Venue booking','Venue requester',now(),now()+interval '1 hour' FROM public.workspaces WHERE slug='default-workspace';
UPDATE public.venue_bookings SET title='Changed venue booking',starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour' WHERE id='50000000-0000-4000-8000-000000000008';
INSERT INTO public.zoom_connections(id,workspace_id,zoom_user_id,email,display_name,token_expires_at,connected_by)
SELECT '50000000-0000-4000-8000-000000000009',id,'zoom-user','zoom@example.test','Zoom connection',now()+interval '1 day','20000000-0000-4000-8000-000000000001' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.zoom_meetings(id,workspace_id,zoom_connection_id,zoom_meeting_id,topic,password,created_by)
SELECT '50000000-0000-4000-8000-000000000010',id,'50000000-0000-4000-8000-000000000009',123456,'Meeting','SECRET-PASSWORD','20000000-0000-4000-8000-000000000001' FROM public.workspaces WHERE slug='default-workspace';
UPDATE public.zoom_meetings SET topic='Changed meeting',password='SECRET-NEW-PASSWORD' WHERE id='50000000-0000-4000-8000-000000000010';
SELECT set_config('moc.user_id','',true),set_config('moc.actor_kind','integration',true),set_config('moc.actor_name','YouTube',true);
UPDATE public.streams SET stream_status='live',stream_key='NEW-SECRET-STREAM-KEY',updated_at=now() WHERE id='50000000-0000-4000-8000-000000000006';
UPDATE public.streams SET stream_key='SECRET-ROTATED-AGAIN',updated_at=now(),notified_at=now() WHERE id='50000000-0000-4000-8000-000000000006';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='30000000-0000-4000-8000-000000000001' AND event_type='work_unlinked')
  OR NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='30000000-0000-4000-8000-000000000002' AND event_type='work_linked') THEN RAISE EXCEPTION 'Relink not reflected in both requests'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000001' AND event_type='equipment_added')
  OR NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000002' AND event_type='equipment_added') THEN RAISE EXCEPTION 'Booking item not reflected on both items'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000003' AND event_type='item_completed' AND jsonb_array_length(changes)=2) THEN RAISE EXCEPTION 'Checklist completion lost simultaneous changes'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000005' AND event_type='media_added') THEN RAISE EXCEPTION 'Playlist mutation missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000008' AND item_kind='venue-booking' AND event_type='updated' AND jsonb_array_length(changes)=3) THEN RAISE EXCEPTION 'Venue booking changes missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000010' AND item_kind='meeting' AND event_type='updated' AND jsonb_array_length(changes)=1) THEN RAISE EXCEPTION 'Meeting change or password filtering wrong'; END IF;
 IF (SELECT count(*) FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000006')<>2 THEN RAISE EXCEPTION 'Provider noise created events'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000006' AND event_type='updated' AND actor_kind='integration' AND actor_name='YouTube') THEN RAISE EXCEPTION 'Integration attribution missing'; END IF;
 IF EXISTS (SELECT 1 FROM public.item_activity WHERE changes::text LIKE '%SECRET%' OR details::text LIKE '%SECRET%' OR details::text LIKE '%PRIVATE-STORAGE%') THEN RAISE EXCEPTION 'Secret leaked to audit'; END IF;
 PERFORM pg_temp.assert_rejected('INSERT INTO public.item_activity(workspace_id,item_kind,item_id,event_type) VALUES(gen_random_uuid(),''request'',gen_random_uuid(),''forged'')','permission denied');
END $$;
DELETE FROM public.checklists WHERE id='50000000-0000-4000-8000-000000000003';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000003' AND event_type='deleted' AND details->'children'->0->>'label'='Set up camera' AND jsonb_array_length(details->'children'->0->'assignees')=1) THEN RAISE EXCEPTION 'Cascade lost child snapshots'; END IF;
END $$;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='50000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Deleted item history readable without parent permission'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF moc_private.discussion_plain_text('["one","two\nthree","Αθήνα <literal>"]') IS DISTINCT FROM E'one\ntwo\nthree\nΑθήνα <literal>' THEN RAISE EXCEPTION 'Ordered plain-text JSON lines changed'; END IF;
 IF moc_private.discussion_plain_text('[broken JSON <literal>') IS DISTINCT FROM '[broken JSON <literal>' THEN RAISE EXCEPTION 'Malformed JSON fallback changed'; END IF;
 IF length(moc_private.discussion_plain_text(repeat('x',30000)))<>30000 THEN RAISE EXCEPTION 'Long content truncated'; END IF;
 IF moc_private.discussion_plain_text(E'  Use <stage> then <camera>\n\tΔοκιμή  ') IS DISTINCT FROM E'  Use <stage> then <camera>\n\tΔοκιμή  ' THEN RAISE EXCEPTION 'Literal text/boundaries changed'; END IF;
 IF moc_private.discussion_plain_text('Two < 3 and 5 > 4') IS DISTINCT FROM 'Two < 3 and 5 > 4' THEN RAISE EXCEPTION 'Comparison text changed'; END IF;
 IF moc_private.discussion_plain_text('["Keep",42,true,{"unknown":"kept"}]') IS DISTINCT FROM '["Keep",42,true,{"unknown":"kept"}]' THEN RAISE EXCEPTION 'Unrecognized JSON shape changed'; END IF;
END $$;
DO $$ DECLARE workspace uuid := gen_random_uuid(); BEGIN
 INSERT INTO public.workspaces(id,name,slug) VALUES(workspace,'Cascade test','discussion-cascade-test');
 INSERT INTO public.equipment(workspace_id,name,serial_number,category,location) VALUES(workspace,'Cascade equipment','CASCADE','camera','Studio');
 DELETE FROM public.workspaces WHERE id=workspace;
 IF EXISTS(SELECT 1 FROM public.item_activity WHERE workspace_id=workspace) THEN RAISE EXCEPTION 'Workspace deletion recreated audit rows'; END IF;
END $$;
ROLLBACK;
