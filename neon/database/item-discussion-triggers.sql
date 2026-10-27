-- Replaces the legacy trigger that only recorded the first changed field.
DROP TRIGGER IF EXISTS record_request_activity ON public.requests;
DO $$
DECLARE spec record;
BEGIN
 FOR spec IN SELECT * FROM (VALUES
  ('requests','request','title,status,category,due_date,requested_by,who,what,when_text,where_text,why,how,flow'),
  ('equipment','equipment','name,serial_number,category,status,location,last_active_on,thumbnail_url'),
  ('bookings','booking','title,booked_by,checked_out_at,expected_return_at,returned_at,status,requested_equipment,other_equipment,request_id'),
  ('venue_bookings','venue-booking','title,venue_id,event_id,event_other,requested_by,status,starts_at,ends_at,cancel_reason,recurrence,request_id'),
  ('checklists','checklist','name,description,scheduled_at,request_id'),
  ('streams','stream','title,description,privacy_status,is_for_kids,scheduled_start_time,actual_start_time,actual_end_time,stream_status,category_id,tags,latency_preference,enable_dvr,enable_embed,enable_auto_start,enable_auto_stop,playlist_id,request_id'),
  ('zoom_meetings','meeting','topic,description,meeting_type,start_time,duration,timezone,recurrence_type,recurrence_interval,recurrence_days,waiting_room,mute_on_entry,continuous_chat,request_id'),
  ('broadcasts','broadcast','title,description,slug,kind'),
  ('scheduled_message_occurrences','scheduled-message','occurrence_on,send_on,body,message_type,post_role,state,attendance_groups,attendee_ids')
 ) AS specifications(relation_name,kind,fields) LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS record_item_activity ON public.%I',spec.relation_name);
  EXECUTE format('DROP TRIGGER IF EXISTS record_item_deletion_activity ON public.%I',spec.relation_name);
  EXECUTE format('CREATE TRIGGER record_item_activity AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION moc_private.record_item_activity(%L,%L)',spec.relation_name,spec.kind,spec.fields);
  EXECUTE format('CREATE TRIGGER record_item_deletion_activity BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION moc_private.record_item_activity(%L,%L)',spec.relation_name,spec.kind,spec.fields);
 END LOOP;
END $$;

-- Recurring schedule settings belong to each occurrence's management trail.
CREATE OR REPLACE FUNCTION moc_private.record_schedule_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE changes jsonb; occurrence record;
BEGIN
 changes := moc_private.item_changes(to_jsonb(OLD),to_jsonb(NEW),ARRAY['starts_on','until_on','timezone','frequency','follow_up_minutes','enabled','send_time']);
 IF changes='[]'::jsonb THEN RETURN NEW; END IF;
 FOR occurrence IN SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=NEW.id LOOP
  PERFORM moc_private.append_item_activity(NEW.workspace_id,'scheduled-message',occurrence.id,'schedule_updated',changes);
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION moc_private.record_schedule_activity() FROM PUBLIC,moc_app,moc_public,moc_worker;
DROP TRIGGER IF EXISTS record_schedule_activity ON public.scheduled_message_schedules;
CREATE TRIGGER record_schedule_activity AFTER UPDATE ON public.scheduled_message_schedules FOR EACH ROW EXECUTE FUNCTION moc_private.record_schedule_activity();

CREATE OR REPLACE FUNCTION moc_private.record_scheduled_delivery_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE occurrence public.scheduled_message_occurrences;
BEGIN
 IF NEW.scheduled_occurrence_id IS NULL OR NEW.status NOT IN ('sent','failed') OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 SELECT * INTO occurrence FROM public.scheduled_message_occurrences WHERE id=NEW.scheduled_occurrence_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 PERFORM moc_private.append_item_activity(occurrence.workspace_id,'scheduled-message',occurrence.id,
  CASE WHEN NEW.status='sent' THEN 'delivery_sent' ELSE 'delivery_failed' END,'[]',
  jsonb_build_object('operation',NEW.scheduled_operation));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION moc_private.record_scheduled_delivery_activity() FROM PUBLIC,moc_app,moc_public,moc_worker;
DROP TRIGGER IF EXISTS record_scheduled_delivery_activity ON public.notification_deliveries;
CREATE TRIGGER record_scheduled_delivery_activity AFTER UPDATE ON public.notification_deliveries FOR EACH ROW EXECUTE FUNCTION moc_private.record_scheduled_delivery_activity();
