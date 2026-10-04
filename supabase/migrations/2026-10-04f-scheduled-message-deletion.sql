BEGIN;

ALTER TABLE public.notification_deliveries DROP CONSTRAINT notification_deliveries_scheduled_operation_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_scheduled_operation_check CHECK (scheduled_operation IN ('send','resend','edit','expire','delete'));

-- Retain occurrences as tombstones so materialization cannot recreate a deleted
-- date. Attendance is retained as history, but all actions are blocked immediately.
CREATE FUNCTION public.delete_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_scope text DEFAULT 'occurrence') RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; target scheduled_message_occurrences; affected uuid[]:='{}'; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id FOR UPDATE;
 IF p_scope NOT IN ('occurrence','future','series') OR (s.frequency='once' AND p_scope<>'occurrence') THEN RAISE EXCEPTION 'Invalid delete scope'; END IF;
 -- Retry the same confirmed operation after a lost response or Telegram failure.
 IF o.state='cancelled' THEN
  SELECT coalesce(array_agg(id),'{}') INTO affected FROM scheduled_message_occurrences
   WHERE schedule_id=s.id AND state='cancelled' AND (id=o.id OR p_scope='series' OR (p_scope='future' AND occurrence_on>=o.occurrence_on));
  UPDATE notification_deliveries SET status='pending',attempt_count=0,next_attempt_at=clock_timestamp()
   WHERE scheduled_occurrence_id=ANY(affected) AND scheduled_operation='delete' AND status='failed';
  RETURN affected;
 END IF;
 IF o.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Message has expired'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before deleting'; END IF;
 -- Do not cancel a provider request already in flight. Locks prevent new claims
 -- from starting while the queue and occurrence cancellation are committed.
 FOR target IN SELECT * FROM scheduled_message_occurrences
  WHERE schedule_id=s.id AND state<>'cancelled' AND expires_at>clock_timestamp()
   AND (id=o.id OR p_scope='series' OR (p_scope='future' AND occurrence_on>=o.occurrence_on))
  ORDER BY occurrence_on FOR UPDATE LOOP
  IF target.state='sending' OR (target.delivery_lease IS NOT NULL AND target.lease_until>clock_timestamp()) THEN RAISE EXCEPTION 'Message delivery is in progress; retry after it finishes'; END IF;
  affected:=array_append(affected,target.id);
 END LOOP;
 IF p_scope='series' OR (p_scope='future' AND o.occurrence_on<=s.starts_on) THEN
  UPDATE scheduled_message_schedules SET enabled=false WHERE id=s.id;
 ELSIF p_scope='future' THEN
  UPDATE scheduled_message_schedules SET until_on=least(coalesce(until_on,o.occurrence_on-1),o.occurrence_on-1) WHERE id=s.id;
 END IF;
 UPDATE notification_deliveries SET status='failed',last_error='Message deleted in Console'
  WHERE scheduled_occurrence_id=ANY(affected) AND status IN ('pending','processing') AND scheduled_operation<>'delete';
 UPDATE scheduled_message_occurrences SET state='cancelled',revision=revision+1,last_sync_error=NULL WHERE id=ANY(affected);
 FOR target IN SELECT * FROM scheduled_message_occurrences WHERE id=ANY(affected) AND telegram_message_id IS NOT NULL LOOP
  PERFORM queue_scheduled_message(target.id,'delete');
 END LOOP;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.delete_scheduled_occurrence(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_scheduled_occurrence(uuid,uuid,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE q notification_deliveries; o scheduled_message_occurrences; s scheduled_message_schedules; BEGIN
 SELECT * INTO STRICT q FROM notification_deliveries WHERE id=p_delivery;
 IF q.status<>'processing' THEN RETURN NULL; END IF;
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
 IF q.scheduled_operation='delete' THEN
  IF o.state<>'cancelled' OR o.telegram_message_id IS NULL THEN
   UPDATE notification_deliveries SET status='failed',last_error='No cancelled Telegram message to delete' WHERE id=q.id; RETURN NULL;
  END IF;
  UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes' WHERE id=o.id;
  RETURN jsonb_build_object('timezone',s.timezone,'occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',true);
 END IF;
 IF q.scheduled_operation='send' AND (o.state<>'scheduled' OR o.expires_at<=clock_timestamp()) THEN
  UPDATE notification_deliveries SET status='failed',last_error='Occurrence cannot be sent' WHERE id=q.id; RETURN NULL;
 END IF;
 IF q.scheduled_operation='resend' AND (o.state<>'sent' OR o.telegram_message_id IS NULL OR o.expires_at<=clock_timestamp()) THEN
  UPDATE notification_deliveries SET status='failed',last_error='Occurrence cannot be resent' WHERE id=q.id; RETURN NULL;
 END IF;
 IF q.scheduled_operation='send' AND NOT coalesce((q.payload->>'manual')::boolean,false) AND
    (NOT s.enabled OR NOT s.auto_send OR o.send_on>clock_timestamp()) THEN
  UPDATE notification_deliveries SET status='pending',next_attempt_at=greatest(clock_timestamp()+interval '1 hour',o.send_on) WHERE id=q.id;
  RETURN NULL;
 END IF;
 IF q.scheduled_operation<>'send' AND o.state<>'sent' THEN
  UPDATE notification_deliveries SET status='failed',last_error='Original message unavailable' WHERE id=q.id; RETURN NULL;
 END IF;
 PERFORM scheduled_validate_destination(o.workspace_id,s.group_chat_id,s.thread_id);
 IF q.scheduled_operation='send' AND NOT o.roster_frozen THEN
  INSERT INTO scheduled_message_responses(occurrence_id,user_id,name)
   SELECT o.id,u.id,trim(concat_ws(' ', u.name, u.surname)) FROM workspace_users w JOIN users u ON u.id=w.user_id WHERE w.workspace_id=o.workspace_id AND w.member_type_id=ANY(o.audience) AND o.message_type='pre_attendance'
    AND nullif(btrim(u.telegram_chat_id),'') IS NOT NULL ON CONFLICT DO NOTHING;
 END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN 'sending' ELSE state END WHERE id=o.id;
 RETURN jsonb_build_object('timezone',s.timezone,'occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',o.expires_at<=clock_timestamp());
END $$;
COMMIT;
