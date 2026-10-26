BEGIN;
SELECT set_config('moc.workspace_id',(SELECT id::text FROM public.workspaces WHERE slug='default-workspace'),true),set_config('moc.user_id','',true);
SET LOCAL ROLE moc_public;
DO $$
DECLARE workspace uuid := current_setting('moc.workspace_id')::uuid; submitted jsonb; looked_up jsonb; changed jsonb; code text; slot timestamptz;
BEGIN
 submitted := public.public_submit_request(workspace,'Public workflow','video_production',now()+interval '1 day',
  'Public requester','Who','What','When','Where','Why','How','Flow');
 code := submitted->>'tracking_code';
 looked_up := public.api_lookup_tracking_submission(code);
 IF looked_up->>'title'<>'Public workflow' OR looked_up ? 'notes' OR looked_up ? 'content' THEN RAISE EXCEPTION 'Public request lookup contract broken'; END IF;
 changed := public.api_update_tracking_submission(code,'request',(looked_up->>'updatedAt')::timestamptz,
  jsonb_build_object('title','Changed title','category','video_production','dueDate',now()+interval '2 days','requestedBy','Public requester',
   'who','Who','what','Changed what','whenText','When','whereText','Where','why','Why','how','How','flow','Flow'));
 IF changed->'submission'->>'title'<>'Changed title' OR changed ? 'error' THEN RAISE EXCEPTION 'Public requester update failed: %',changed; END IF;
 changed := public.api_delete_tracking_submission(code,'request',(changed->'submission'->>'updatedAt')::timestamptz);
 IF changed->>'entityId' IS DISTINCT FROM submitted->>'id' THEN RAISE EXCEPTION 'Public requester delete failed'; END IF;
 SELECT to_jsonb(equipment) INTO looked_up FROM public.public_browse_equipment(workspace) equipment LIMIT 1;
 IF looked_up IS NULL OR looked_up ? 'notes' THEN RAISE EXCEPTION 'Public equipment browse still exposes notes'; END IF;
 submitted := public.public_submit_booking_batch(workspace,'Public booking',ARRAY[]::uuid[],'Public borrower',now()+interval '3 days',now()+interval '3 days 2 hours',ARRAY['Camera'],NULL);
 code := submitted->>'tracking_code';
 looked_up := public.api_lookup_tracking_submission(code);
 IF looked_up->>'title'<>'Public booking' OR looked_up ? 'notes' OR public.public_lookup_tracking(code) ? 'notes' THEN RAISE EXCEPTION 'Public booking lookup contract broken'; END IF;
 changed := public.api_update_tracking_submission(code,'booking',(looked_up->>'updatedAt')::timestamptz,
  jsonb_build_object('title','Changed booking','bookedBy','Public borrower','checkedOutAt',now()+interval '3 days','expectedReturnAt',now()+interval '3 days 3 hours','requestedEquipment',jsonb_build_array('Camera'),'otherEquipment',NULL));
 IF changed->'submission'->>'title'<>'Changed booking' OR changed ? 'error' THEN RAISE EXCEPTION 'Public booking update failed: %',changed; END IF;
 changed := public.api_delete_tracking_submission(code,'booking',(changed->'submission'->>'updatedAt')::timestamptz);
 IF changed->>'entityId' IS DISTINCT FROM submitted->>'booking_id' THEN RAISE EXCEPTION 'Public booking delete failed'; END IF;
 SELECT availability.slot_start INTO slot FROM public.public_venue_availability(workspace,current_date+3,'70000000-0000-4000-8000-000000000003') availability WHERE available LIMIT 1;
 IF slot IS NULL THEN RAISE EXCEPTION 'Venue test has no valid slot'; END IF;
 submitted := public.public_submit_venue_booking(workspace,'70000000-0000-4000-8000-000000000003','Public venue requester',ARRAY[slot],NULL,'Rehearsal',NULL);
 code := submitted->>'tracking_code';
 looked_up := public.api_lookup_tracking_venue_booking(code);
 IF looked_up->>'title'<>'Rehearsal' OR looked_up ? 'notes' OR public.api_lookup_tracking_submission(code) ? 'notes' OR public.public_lookup_tracking(code) ? 'notes' THEN RAISE EXCEPTION 'Public venue lookup contract broken'; END IF;
 changed := public.api_update_tracking_venue_booking(code,(looked_up->>'updatedAt')::timestamptz,
  jsonb_build_object('venueId','70000000-0000-4000-8000-000000000003','requestedBy','Public venue requester','eventOther','Updated rehearsal','slotStarts',jsonb_build_array(slot),'recurrence',NULL));
 IF changed->'submission'->>'title'<>'Updated rehearsal' OR changed ? 'error' THEN RAISE EXCEPTION 'Public venue update failed: %',changed; END IF;
 changed := public.api_delete_tracking_submission(code,'venue_booking',(changed->'submission'->>'updatedAt')::timestamptz);
 IF changed->>'entityId' IS DISTINCT FROM submitted->>'id' THEN RAISE EXCEPTION 'Public venue delete failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.item_activity WHERE actor_kind='requester' AND actor_name='Public requester' AND event_type='created')
  OR NOT EXISTS (SELECT 1 FROM public.item_activity WHERE actor_kind='requester' AND actor_name='Public requester' AND event_type='updated' AND jsonb_array_length(changes)=3) THEN
  RAISE EXCEPTION 'Public requester attribution or multi-field audit failed';
 END IF;
END $$;
ROLLBACK;
