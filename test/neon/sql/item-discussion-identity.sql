\ir assert-rejected.sql
BEGIN;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true),
 set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true);
INSERT INTO public.request_assignees(id,request_id,user_id,duty)
VALUES('80000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Video');
UPDATE public.request_assignees SET user_id='20000000-0000-4000-8000-000000000001' WHERE id='80000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE event_type='assignee_added' AND details->>'child_id'='80000000-0000-4000-8000-000000000001' AND details->>'label'='Eli Editor' AND details->>'after_label'='Eli Editor' AND NOT details ? 'before_label') THEN RAISE EXCEPTION 'Assignee addition label changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE event_type='assignee_updated' AND details->>'child_id'='80000000-0000-4000-8000-000000000001' AND details->>'before_label'='Eli Editor' AND details->>'after_label'='Ada Admin' AND details->>'label'='Ada Admin'
  AND changes @> '[{"field":"user_id","before":"20000000-0000-4000-8000-000000000002","after":"20000000-0000-4000-8000-000000000001"}]') THEN RAISE EXCEPTION 'Reassignment lost independent old/new labels'; END IF;
END $$;
DELETE FROM public.request_assignees WHERE id='80000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE event_type='assignee_removed' AND details->>'child_id'='80000000-0000-4000-8000-000000000001' AND details->>'label'='Ada Admin' AND details->>'before_label'='Ada Admin' AND NOT details ? 'after_label') THEN RAISE EXCEPTION 'Assignee removal label changed'; END IF;
END $$;
SET LOCAL ROLE moc_worker;
INSERT INTO public.equipment(id,workspace_id,name,serial_number,category,location)
SELECT equipment.id,workspace.id,equipment.name,equipment.serial,'camera','Store' FROM public.workspaces workspace
CROSS JOIN (VALUES('80000000-0000-4000-8000-000000000002'::uuid,'Old camera','IDENTITY-OLD'),('80000000-0000-4000-8000-000000000003'::uuid,'New camera','IDENTITY-NEW')) equipment(id,name,serial)
WHERE workspace.slug='default-workspace';
INSERT INTO public.bookings(id,workspace_id,title,booked_by,checked_out_at,expected_return_at)
SELECT '80000000-0000-4000-8000-000000000004',id,'Identity booking','Borrower',now(),now()+interval '1 day' FROM public.workspaces WHERE slug='default-workspace';
INSERT INTO public.booking_items(id,booking_id,equipment_id) VALUES('80000000-0000-4000-8000-000000000005','80000000-0000-4000-8000-000000000004','80000000-0000-4000-8000-000000000002');
UPDATE public.booking_items SET equipment_id='80000000-0000-4000-8000-000000000003' WHERE id='80000000-0000-4000-8000-000000000005';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE item_kind='booking' AND event_type='equipment_updated' AND details->>'child_id'='80000000-0000-4000-8000-000000000005' AND details->>'before_label'='Old camera' AND details->>'after_label'='New camera' AND details->>'label'='New camera') THEN RAISE EXCEPTION 'Equipment identity update lost old/new names'; END IF;
END $$;
-- Exercise the real structure RPC: moving only the parent still records both
-- trails, while replaying the same structure does not create another event.
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id','20000000-0000-4000-8000-000000000001',true);
INSERT INTO public.checklists(id,workspace_id,name)
SELECT checklist.id,workspace.id,checklist.name FROM public.workspaces workspace
CROSS JOIN (VALUES('80000000-0000-4000-8000-000000000006'::uuid,'Source checklist'),('80000000-0000-4000-8000-000000000007'::uuid,'Destination checklist')) checklist(id,name)
WHERE workspace.slug='default-workspace';
INSERT INTO public.checklist_items(id,checklist_id,label,checked,sort_order)
VALUES('80000000-0000-4000-8000-000000000008','80000000-0000-4000-8000-000000000006','Move camera',false,0);
SELECT public.save_checklist_structure('80000000-0000-4000-8000-000000000007',
 '{"items":[{"id":"80000000-0000-4000-8000-000000000008","label":"Move camera","checked":false,"sort_order":0}]}');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.item_activity WHERE item_id='80000000-0000-4000-8000-000000000006' AND event_type='item_removed' AND details->>'child_id'='80000000-0000-4000-8000-000000000008' AND details->>'moved_to'='80000000-0000-4000-8000-000000000007')
  OR NOT EXISTS(SELECT 1 FROM public.item_activity WHERE item_id='80000000-0000-4000-8000-000000000007' AND event_type='item_added' AND details->>'child_id'='80000000-0000-4000-8000-000000000008' AND details->>'moved_from'='80000000-0000-4000-8000-000000000006') THEN RAISE EXCEPTION 'Checklist move lost an old/new parent trail'; END IF;
END $$;
DO $$ DECLARE activity_count bigint := (SELECT count(*) FROM public.item_activity WHERE details->>'child_id'='80000000-0000-4000-8000-000000000008'); BEGIN
 PERFORM public.save_checklist_structure('80000000-0000-4000-8000-000000000007',
  '{"items":[{"id":"80000000-0000-4000-8000-000000000008","label":"Move camera","checked":false,"sort_order":0}]}');
 IF (SELECT count(*) FROM public.item_activity WHERE details->>'child_id'='80000000-0000-4000-8000-000000000008')<>activity_count THEN RAISE EXCEPTION 'Repeated checklist structure created activity'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.workspaces(id,name,slug) VALUES('80000000-0000-4000-8000-000000000009','Private move target','private-move-target');
INSERT INTO public.checklists(id,workspace_id,name) VALUES('80000000-0000-4000-8000-000000000010','80000000-0000-4000-8000-000000000009','Private checklist');
SET LOCAL ROLE moc_app;
DO $$ BEGIN
 PERFORM pg_temp.assert_rejected($move$SELECT public.save_checklist_structure('80000000-0000-4000-8000-000000000010',
  '{"items":[{"id":"80000000-0000-4000-8000-000000000008","label":"Move camera","checked":false,"sort_order":0}]}')$move$,'row-level security');
 IF EXISTS(SELECT 1 FROM public.item_activity WHERE workspace_id='80000000-0000-4000-8000-000000000009') THEN RAISE EXCEPTION 'Unauthorized checklist history exposed'; END IF;
END $$;
ROLLBACK;
