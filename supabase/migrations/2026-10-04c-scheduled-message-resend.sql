BEGIN;

ALTER TABLE public.notification_deliveries DROP CONSTRAINT notification_deliveries_scheduled_operation_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_scheduled_operation_check CHECK (scheduled_operation IN ('send','resend','edit','expire'));

-- Resending retains the occurrence, frozen roster and all responses. A new
-- revision gives each intentional resend its own existing queue identity.
CREATE FUNCTION public.request_scheduled_resend(p_actor uuid,p_id uuid,p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; queued uuid; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.expires_at<=clock_timestamp() OR o.state<>'sent' OR o.telegram_message_id IS NULL THEN RAISE EXCEPTION 'Message cannot be resent'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before resending'; END IF;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'Message delivery is in progress; retry after it finishes'; END IF;
 SELECT id INTO queued FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='resend' AND status IN ('pending','processing') LIMIT 1;
 IF queued IS NOT NULL THEN
  UPDATE notification_deliveries SET next_attempt_at=clock_timestamp() WHERE id=queued;
  RETURN;
 END IF;
 -- Edits queued for the deleted message are replaced by the current resend.
 UPDATE notification_deliveries SET status='failed',last_error='Superseded by resend' WHERE scheduled_occurrence_id=o.id AND scheduled_operation='edit' AND status IN ('pending','processing');
 UPDATE scheduled_message_occurrences SET revision=revision+1 WHERE id=o.id;
 PERFORM queue_scheduled_message(o.id,'resend');
END $$;

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
    (NOT s.enabled OR NOT s.auto_send OR o.send_on>(clock_timestamp() AT TIME ZONE s.timezone)::date) THEN
  UPDATE notification_deliveries SET status='pending',next_attempt_at=greatest(clock_timestamp()+interval '1 day',o.send_on::timestamp AT TIME ZONE s.timezone) WHERE id=q.id;
  RETURN NULL;
 END IF;
 IF q.scheduled_operation<>'send' AND o.state<>'sent' THEN
  UPDATE notification_deliveries SET status='failed',last_error='Original message unavailable' WHERE id=q.id; RETURN NULL;
 END IF;
 PERFORM scheduled_validate_destination(o.workspace_id,s.group_chat_id,s.thread_id);
 IF q.scheduled_operation='send' AND NOT o.roster_frozen THEN
  INSERT INTO scheduled_message_responses(occurrence_id,user_id,name)
   SELECT o.id,u.id,trim(u.name||' '||u.surname) FROM workspace_users w JOIN users u ON u.id=w.user_id WHERE w.workspace_id=o.workspace_id AND w.member_type_id=ANY(o.audience) AND o.message_type='pre_attendance' ON CONFLICT DO NOTHING;
 END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN 'sending' ELSE state END WHERE id=o.id;
 RETURN jsonb_build_object('occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',o.expires_at<=clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.finish_scheduled_delivery(p_delivery uuid,p_revision integer,p_message bigint,p_error text DEFAULT NULL,p_ambiguous boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE q notification_deliveries; o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT q FROM notification_deliveries WHERE id=p_delivery;
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 IF o.delivery_lease IS DISTINCT FROM q.id THEN RAISE EXCEPTION 'Delivery lease lost'; END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=NULL,lease_until=NULL,last_sync_error=p_error,
  state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN CASE WHEN p_error IS NULL AND p_message IS NOT NULL THEN 'sent' WHEN p_ambiguous THEN 'unknown' WHEN q.scheduled_operation='resend' THEN 'sent' ELSE 'scheduled' END ELSE state END,
  telegram_message_id=CASE WHEN q.scheduled_operation IN ('send','resend') AND p_error IS NULL AND p_message IS NOT NULL THEN p_message ELSE telegram_message_id END,
  synced_revision=CASE WHEN p_error IS NULL THEN greatest(synced_revision,p_revision) ELSE synced_revision END WHERE id=o.id;
 IF p_error IS NULL AND o.revision>p_revision AND q.scheduled_operation<>'expire' THEN PERFORM queue_scheduled_message(o.id,'edit'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recover_scheduled_deliveries() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 UPDATE scheduled_message_occurrences SET state='unknown',last_sync_error='Send interrupted; verify Telegram before reconciliation',delivery_lease=NULL,lease_until=NULL
  WHERE state='sending' AND lease_until<clock_timestamp();
 UPDATE notification_deliveries q SET status='failed',last_error='Send outcome unknown; automatic resend disabled' FROM scheduled_message_occurrences o WHERE q.scheduled_occurrence_id=o.id AND q.scheduled_operation IN ('send','resend') AND o.state='unknown' AND q.status IN ('pending','processing');
END $$;

REVOKE ALL ON FUNCTION public.request_scheduled_resend(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_scheduled_resend(uuid,uuid,integer) TO service_role;
COMMIT;
