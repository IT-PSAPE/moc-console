-- Keep a stable display name for the user who created new schedules.
ALTER TABLE public.scheduled_message_schedules ADD COLUMN IF NOT EXISTS creator_name text;

CREATE OR REPLACE FUNCTION moc_private.set_scheduled_schedule_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','pg_temp' AS $$
DECLARE actor_id uuid:=nullif(current_setting('moc.user_id',true),'')::uuid;
BEGIN
 IF NEW.creator_name IS NULL AND actor_id IS NOT NULL THEN
  SELECT nullif(trim(concat_ws(' ',u.name,u.surname)),'') INTO NEW.creator_name FROM public.users u WHERE u.id=actor_id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS scheduled_schedule_creator_attribution ON public.scheduled_message_schedules;
CREATE TRIGGER scheduled_schedule_creator_attribution BEFORE INSERT ON public.scheduled_message_schedules
FOR EACH ROW EXECUTE FUNCTION moc_private.set_scheduled_schedule_creator();
REVOKE ALL ON FUNCTION moc_private.set_scheduled_schedule_creator() FROM PUBLIC,moc_app,moc_worker;

-- Capture the actor that queued each durable scheduled delivery. The payload
-- travels with the notification delivery, so retries keep the same attribution.
CREATE OR REPLACE FUNCTION moc_private.queue_scheduled_message(p_id uuid,p_operation text) RETURNS void
LANGUAGE plpgsql SET search_path='public','pg_temp' AS $$
DECLARE
 o public.scheduled_message_occurrences;
 s public.scheduled_message_schedules;
 actor_id uuid:=nullif(current_setting('moc.user_id',true),'')::uuid;
 actor_source text:=coalesce(nullif(current_setting('moc.actor_kind',true),''),CASE WHEN actor_id IS NULL THEN 'automation' ELSE 'member' END);
 actor_name text;
 delivery_payload jsonb;
BEGIN
 IF p_operation NOT IN ('send','resend','edit','delete') THEN RAISE EXCEPTION 'Unsupported scheduled-message operation'; END IF;
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id;
 SELECT * INTO STRICT s FROM public.scheduled_message_schedules WHERE id=o.schedule_id;
 IF actor_id IS NOT NULL THEN
  SELECT nullif(trim(concat_ws(' ',u.name,u.surname)),'') INTO actor_name FROM public.users u WHERE u.id=actor_id;
 END IF;
 delivery_payload:=jsonb_build_object(
  'telegramActor',jsonb_strip_nulls(jsonb_build_object('source',CASE WHEN actor_id IS NULL THEN 'automation' WHEN actor_source IN ('member','requester') THEN actor_source ELSE 'unknown' END,'name',actor_name)),
  'scheduleCreator',jsonb_strip_nulls(jsonb_build_object('source','member','name',s.creator_name))
 );
 INSERT INTO public.notification_deliveries(workspace_id,event_key,event_type,scope,destination_key,chat_id,thread_id,text,payload,entity_type,entity_id,scheduled_occurrence_id,scheduled_operation)
 VALUES(o.workspace_id,'scheduled:'||o.id||':'||CASE WHEN p_operation='send' THEN 'send' ELSE p_operation||':'||o.revision END,'scheduled_message','group','group:'||s.group_chat_id||':'||coalesce(s.thread_id::text,'main'),s.group_chat_id,s.thread_id,'Scheduled message',
  delivery_payload,'scheduled_message',o.id,o.id,p_operation)
 ON CONFLICT(event_key,destination_key) DO NOTHING;
END $$;

-- Preserve actor data from queue_scheduled_message while marking explicit sends
-- as manual, including when an earlier automatic send was deferred.
CREATE OR REPLACE FUNCTION public.request_scheduled_send(p_actor uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences;
BEGIN
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF NOT moc_private.scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.post_role<>'primary' THEN RAISE EXCEPTION 'Follow-up messages are sent automatically'; END IF;
 IF o.legacy_closed OR o.state<>'scheduled' THEN RAISE EXCEPTION 'Message cannot be sent'; END IF;
 PERFORM moc_private.queue_scheduled_message(o.id,'send');
 UPDATE public.notification_deliveries SET
  payload=CASE WHEN status='failed' OR NOT coalesce((payload->>'manual')::boolean,false)
    THEN coalesce(payload,'{}'::jsonb)||jsonb_build_object('manual',true,'telegramActor',jsonb_strip_nulls(jsonb_build_object('source','member','name',nullif(trim((SELECT concat_ws(' ',u.name,u.surname) FROM public.users u WHERE u.id=p_actor)),''))))
    ELSE payload END,
  next_attempt_at=clock_timestamp(),status=CASE WHEN status='failed' THEN 'pending' ELSE status END
 WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send';
END $$;
