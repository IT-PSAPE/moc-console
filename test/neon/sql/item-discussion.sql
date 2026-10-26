\ir assert-rejected.sql
BEGIN;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='requests' AND column_name IN ('notes','content')) OR (table_name IN ('equipment','bookings','venue_bookings') AND column_name='notes'))) THEN RAISE EXCEPTION 'Obsolete item notes/content remain'; END IF;
 IF (SELECT count(*) FROM public.item_comments WHERE item_id='30000000-0000-4000-8000-000000000001')<>3 THEN RAISE EXCEPTION 'Legacy comments not migrated exactly once'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE id='40000000-0000-4000-8000-000000000001' AND created_at='2026-01-01 10:00Z' AND body='Original comment') THEN RAISE EXCEPTION 'Comment identity or time lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE origin='legacy-content' AND body='<p>Existing <strong>formatted</strong> content</p><script>alert(1)</script>' AND actor_kind='unknown' AND actor_id IS NULL) THEN RAISE EXCEPTION 'Content text/provenance was not preserved safely'; END IF;
 IF NOT EXISTS (SELECT 1 FROM moc_private.request_discussion_backup WHERE request_id='30000000-0000-4000-8000-000000000001' AND content LIKE '%<script>%') THEN RAISE EXCEPTION 'Original content backup lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE item_id='30000000-0000-4000-8000-000000000003' AND origin='legacy-note' AND body=E'  Use <stage> then <camera>\n\tΔοκιμή  ') THEN RAISE EXCEPTION 'Literal note fidelity lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE item_id='30000000-0000-4000-8000-000000000003' AND origin='legacy-content' AND body=E'first\nsecond\nthird\nΑθήνα <literal>') THEN RAISE EXCEPTION 'DocEditor content ordering lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.notification_message_templates WHERE message_type='request.created' AND body='Custom {{title}}: {{what}}') THEN RAISE EXCEPTION 'Custom request notification token not migrated'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.notification_message_templates WHERE message_type='booking.created' AND body='Custom booking {{title}}') THEN RAISE EXCEPTION 'Custom booking notification body not preserved'; END IF;
 IF (SELECT count(*) FROM public.item_comments WHERE item_id IN ('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000004') AND origin='legacy-note' AND actor_id IS NULL AND actor_kind='unknown')<>3 THEN RAISE EXCEPTION 'Other item notes not migrated exactly once'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE item_id='70000000-0000-4000-8000-000000000001' AND body=E'  Use <stage> then <camera>\n\tΔοκιμή  ') THEN RAISE EXCEPTION 'Equipment note fidelity lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments comments JOIN moc_private.item_notes_backup backup USING(item_kind,item_id) WHERE comments.item_id='70000000-0000-4000-8000-000000000002' AND comments.body=repeat('Long booking note <literal> ',1200) AND comments.created_at=backup.backed_up_at AND backup.source_created_at='2025-12-10 09:00Z') THEN RAISE EXCEPTION 'Booking note truncated or source/migration dates lost'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_comments comments JOIN moc_private.item_notes_backup backup USING(item_kind,item_id) WHERE comments.item_id='70000000-0000-4000-8000-000000000004' AND comments.body=E'Venue notes\nKeep all original lines.' AND comments.created_at=backup.backed_up_at AND backup.source_created_at='2025-12-11 09:00Z') THEN RAISE EXCEPTION 'Venue note fidelity/source dates lost'; END IF;
 IF EXISTS (SELECT 1 FROM public.item_activity WHERE actor_kind='system' AND details ? 'requester_name') THEN RAISE EXCEPTION 'Legacy unknown actor falsely marked system'; END IF;
END $$;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
  set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
UPDATE public.requests SET title='Renamed request',status='in_progress',due_date=due_date+interval '1 day'
WHERE id='30000000-0000-4000-8000-000000000001';
DO $$
DECLARE event public.item_activity;
BEGIN
 SELECT * INTO STRICT event FROM public.item_activity WHERE item_id='30000000-0000-4000-8000-000000000001' AND event_type='updated';
 IF jsonb_array_length(event.changes)<>3 OR event.actor_kind<>'member' OR event.actor_name<>'Ada Admin' THEN RAISE EXCEPTION 'Multi-field changes or actor not recorded'; END IF;
END $$;
UPDATE public.requests SET title=title,updated_at=now() WHERE id='30000000-0000-4000-8000-000000000001';
INSERT INTO public.request_assignees (request_id,user_id,duty) VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Video');
DO $$
BEGIN
 IF (SELECT count(*) FROM public.item_activity WHERE item_id='30000000-0000-4000-8000-000000000001' AND event_type='updated')<>1 THEN RAISE EXCEPTION 'No-op emitted activity'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE item_id='30000000-0000-4000-8000-000000000001' AND event_type='assignee_added') THEN RAISE EXCEPTION 'Assignment not recorded'; END IF;
 PERFORM pg_temp.assert_rejected($q$INSERT INTO public.item_activity (workspace_id,item_kind,item_id,event_type) SELECT id,'request','30000000-0000-4000-8000-000000000001','forged' FROM public.workspaces WHERE slug='default-workspace'$q$,'permission denied');
 PERFORM pg_temp.assert_rejected('DELETE FROM public.item_activity','permission denied');
 PERFORM pg_temp.assert_rejected('SELECT * FROM moc_private.request_discussion_backup','permission denied');
 PERFORM pg_temp.assert_rejected('SELECT * FROM moc_private.item_notes_backup','permission denied');
END $$;
INSERT INTO public.item_comments (id,workspace_id,item_kind,item_id,actor_id,actor_kind,body)
SELECT '40000000-0000-4000-8000-000000000002',id,'request','30000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','member','A new comment' FROM public.workspaces WHERE slug='default-workspace';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.item_comments WHERE body='A new comment' AND actor_name='Ada Admin') THEN RAISE EXCEPTION 'Comment snapshot missing'; END IF;
 PERFORM pg_temp.assert_rejected($q$UPDATE public.item_comments SET body='tampered'$q$,'permission denied');
END $$;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000003',true);
DO $$
BEGIN
 PERFORM pg_temp.assert_rejected($q$INSERT INTO public.item_comments (workspace_id,item_kind,item_id,actor_id,actor_kind,body) SELECT id,'request','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','member','Viewer write' FROM public.workspaces WHERE slug='default-workspace'$q$,'row-level security');
END $$;
SELECT set_config('moc.workspace_id','10000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.item_activity) OR EXISTS (SELECT 1 FROM public.item_comments) THEN RAISE EXCEPTION 'Cross-workspace disclosure'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
