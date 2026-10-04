BEGIN;

-- Freeze the selected audience at send time, including only linked Telegram users.
CREATE OR REPLACE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE q notification_deliveries; o scheduled_message_occurrences; s scheduled_message_schedules; BEGIN
 SELECT * INTO STRICT q FROM notification_deliveries WHERE id=p_delivery AND status='processing';
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
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

REVOKE ALL ON FUNCTION public.begin_scheduled_delivery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_scheduled_delivery(uuid) TO service_role;

-- Remove only unanswered, unlinked entries from active legacy rosters.
-- Saved attendance and expired history remain intact. Occurrence locks serialize
-- this cleanup with replies/delivery; an in-flight delivery gets a follow-up edit
-- through the existing revision check in finish_scheduled_delivery.
DO $$ DECLARE item record; removed integer; BEGIN
 FOR item IN
  SELECT o.id,o.state FROM public.scheduled_message_occurrences o
  WHERE o.message_type='pre_attendance' AND o.state IN ('scheduled','sent','sending')
   AND o.expires_at>clock_timestamp() AND EXISTS (
    SELECT 1 FROM public.scheduled_message_responses r JOIN public.users u ON u.id=r.user_id
    WHERE r.occurrence_id=o.id AND r.status='awaiting' AND nullif(btrim(u.telegram_chat_id),'') IS NULL
   ) ORDER BY o.id FOR UPDATE OF o
 LOOP
  DELETE FROM public.scheduled_message_responses r USING public.users u
   WHERE r.occurrence_id=item.id AND u.id=r.user_id AND r.status='awaiting'
    AND nullif(btrim(u.telegram_chat_id),'') IS NULL;
  GET DIAGNOSTICS removed=ROW_COUNT;
  IF removed>0 THEN
   UPDATE public.scheduled_message_occurrences SET revision=revision+1 WHERE id=item.id;
   IF item.state='sent' THEN PERFORM private.queue_scheduled_message(item.id,'edit'); END IF;
  END IF;
 END LOOP;
END $$;
COMMIT;
