BEGIN;
CREATE FUNCTION public.save_scheduled_template(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_id uuid; v_type text:=p_data->>'messageType'; v_audience uuid[]; BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF v_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 PERFORM scheduled_validate_fields(v_type,p_data->'fields');
 SELECT coalesce(array_agg(value::uuid),'{}') INTO v_audience FROM jsonb_array_elements_text(coalesce(p_data->'audience','[]'));
 IF EXISTS(SELECT 1 FROM unnest(v_audience) a WHERE NOT EXISTS(SELECT 1 FROM workspace_member_types WHERE id=a AND workspace_id=p_workspace)) THEN RAISE EXCEPTION 'Invalid member type'; END IF;
 IF v_type='pre_attendance' AND cardinality(v_audience)=0 THEN RAISE EXCEPTION 'Select at least one member type'; END IF;
 INSERT INTO scheduled_message_templates(workspace_id,name,message_type,body,fields,audience,require_arrival)
 VALUES(p_workspace,p_data->>'name',v_type,p_data->>'body',p_data->'fields',v_audience,coalesce((p_data->>'requireArrival')::boolean,false)) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.create_scheduled_schedule(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE t scheduled_message_templates; v_id uuid; zone text:=coalesce(p_data->>'timezone','Africa/Johannesburg'); BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO STRICT t FROM scheduled_message_templates WHERE id=(p_data->>'templateId')::uuid AND workspace_id=p_workspace;
 PERFORM scheduled_validate_destination(p_workspace,p_data->>'groupChatId',(p_data->>'threadId')::bigint);
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 IF coalesce((p_data->>'autoSend')::boolean,true) AND coalesce((p_data->>'expiryHours')::integer,72)<24 THEN RAISE EXCEPTION 'Automatic schedules need at least 24 expiry hours for the daily worker; use manual delivery for shorter windows'; END IF;
 INSERT INTO scheduled_message_schedules(workspace_id,template_id,group_chat_id,thread_id,starts_on,until_on,timezone,frequency,auto_send,expiry_hours,fields,body,message_type,audience,require_arrival)
 VALUES(p_workspace,t.id,p_data->>'groupChatId',(p_data->>'threadId')::bigint,(p_data->>'startsOn')::date,(p_data->>'untilOn')::date,zone,p_data->>'frequency',coalesce((p_data->>'autoSend')::boolean,true),coalesce((p_data->>'expiryHours')::integer,72),t.fields,t.body,t.message_type,t.audience,t.require_arrival) RETURNING id INTO v_id;
 PERFORM materialize_scheduled_messages(v_id);
 RETURN v_id;
END $$;

CREATE FUNCTION public.change_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_field text,p_value text,p_scope text DEFAULT 'occurrence') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; target scheduled_message_occurrences; f jsonb; h integer; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.expires_at<=clock_timestamp() OR o.state IN ('unknown','cancelled','sending') THEN RAISE EXCEPTION 'Message is no longer editable'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before applying'; END IF;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id FOR UPDATE;
 IF p_scope NOT IN ('occurrence','future','series') OR (s.frequency='once' AND p_scope<>'occurrence') THEN RAISE EXCEPTION 'Invalid edit scope'; END IF;
 IF p_field IN ('sendOn','expiresAt') AND p_scope<>'occurrence' THEN RAISE EXCEPTION 'Date changes apply only to this occurrence; use expiry hours for the series'; END IF;
 IF p_field='sendOn' AND o.state<>'scheduled' THEN RAISE EXCEPTION 'A sent message cannot be rescheduled'; END IF;
 IF p_field='expiryHours' THEN
  h:=p_value::integer; IF h NOT BETWEEN 1 AND 8760 THEN RAISE EXCEPTION 'Expiry hours must be 1 to 8760'; END IF;
  IF s.auto_send AND h<24 THEN RAISE EXCEPTION 'Automatic schedules need at least 24 expiry hours for the daily worker'; END IF;
 ELSIF p_field='expiresAt' THEN
  IF p_value::timestamptz<=clock_timestamp() OR p_value::timestamptz<=(o.send_on::timestamp AT TIME ZONE s.timezone) THEN RAISE EXCEPTION 'Expiry must be after the send date and in the future'; END IF;
 ELSIF p_field='sendOn' THEN
  IF (p_value::date::timestamp AT TIME ZONE s.timezone)>=o.expires_at THEN RAISE EXCEPTION 'Send date must precede expiry'; END IF;
 ELSE
  f:=jsonb_set(o.fields,ARRAY[p_field],to_jsonb(p_value),true); PERFORM scheduled_validate_fields(o.message_type,f);
 END IF;
 -- A series-wide edit supersedes future patches of the same field. It does
 -- not overwrite unrelated exceptions or resurrect expired history.
 IF p_scope='series' THEN
  DELETE FROM scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field;
  IF p_field='expiryHours' THEN UPDATE scheduled_message_schedules SET expiry_hours=h WHERE id=s.id;
  ELSE UPDATE scheduled_message_schedules SET fields=jsonb_set(fields,ARRAY[p_field],to_jsonb(p_value),true) WHERE id=s.id; END IF;
 ELSIF p_scope='future' THEN
  DELETE FROM scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field AND effective_on>=o.occurrence_on;
  INSERT INTO scheduled_message_series_changes(schedule_id,effective_on,field,value) VALUES(s.id,o.occurrence_on,p_field,p_value);
 END IF;
 FOR target IN SELECT * FROM scheduled_message_occurrences WHERE schedule_id=s.id AND expires_at>clock_timestamp() AND state IN ('scheduled','sent') AND
  (id=o.id OR p_scope='series' OR (p_scope='future' AND occurrence_on>=o.occurrence_on)) ORDER BY occurrence_on FOR UPDATE LOOP
  UPDATE scheduled_message_occurrences SET
   fields=CASE WHEN p_field NOT IN ('sendOn','expiresAt','expiryHours') THEN jsonb_set(fields,ARRAY[p_field],to_jsonb(p_value),true) ELSE fields END,
   send_on=CASE WHEN p_field='sendOn' THEN p_value::date ELSE send_on END,
   expires_at=CASE WHEN p_field='expiresAt' THEN p_value::timestamptz WHEN p_field='expiryHours' THEN (send_on::timestamp AT TIME ZONE s.timezone)+make_interval(hours=>h) ELSE expires_at END,
   revision=revision+1 WHERE id=target.id;
  IF target.state='sent' THEN PERFORM queue_scheduled_message(target.id,'edit'); END IF;
 END LOOP;
END $$;

CREATE FUNCTION public.request_scheduled_send(p_actor uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.expires_at<=clock_timestamp() OR o.state<>'scheduled' THEN RAISE EXCEPTION 'Message cannot be sent'; END IF;
 PERFORM queue_scheduled_message(o.id,'send');
 UPDATE notification_deliveries SET payload=jsonb_build_object('manual',true),next_attempt_at=clock_timestamp(),status=CASE WHEN status='failed' THEN 'pending' ELSE status END WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send';
END $$;

CREATE FUNCTION public.respond_scheduled_attendance(p_actor uuid,p_id uuid,p_revision integer,p_status text,p_arrival text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF o.expires_at<=clock_timestamp() OR o.state<>'sent' OR o.message_type<>'pre_attendance' THEN RAISE EXCEPTION 'Attendance is closed'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before responding'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_users WHERE workspace_id=o.workspace_id AND user_id=p_actor) OR NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id=p_actor) THEN RAISE EXCEPTION 'You are not in this attendance roster'; END IF;
 IF p_status NOT IN ('attending','not_attending') THEN RAISE EXCEPTION 'Invalid attendance status'; END IF;
 IF p_status='attending' AND o.require_arrival AND (p_arrival IS NULL OR NOT (p_arrival ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) THEN RAISE EXCEPTION 'An arrival time is required'; END IF;
 UPDATE scheduled_message_responses SET status=p_status,arrival_time=CASE WHEN p_status='attending' THEN p_arrival ELSE NULL END,acknowledged_revision=o.revision WHERE occurrence_id=o.id AND user_id=p_actor;
 UPDATE scheduled_message_occurrences SET revision=revision+1 WHERE id=o.id;
 PERFORM queue_scheduled_message(o.id,'edit');
END $$;

CREATE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE q notification_deliveries; o scheduled_message_occurrences; s scheduled_message_schedules; BEGIN
 SELECT * INTO STRICT q FROM notification_deliveries WHERE id=p_delivery AND status='processing';
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
 IF q.scheduled_operation='send' AND (o.state<>'scheduled' OR o.expires_at<=clock_timestamp()) THEN
  UPDATE notification_deliveries SET status='failed',last_error='Occurrence cannot be sent' WHERE id=q.id; RETURN NULL;
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
 UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,state=CASE WHEN q.scheduled_operation='send' THEN 'sending' ELSE state END WHERE id=o.id;
 RETURN jsonb_build_object('occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',o.expires_at<=clock_timestamp());
END $$;

CREATE FUNCTION public.finish_scheduled_delivery(p_delivery uuid,p_revision integer,p_message bigint,p_error text DEFAULT NULL,p_ambiguous boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE q notification_deliveries; o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT q FROM notification_deliveries WHERE id=p_delivery;
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 IF o.delivery_lease IS DISTINCT FROM q.id THEN RAISE EXCEPTION 'Delivery lease lost'; END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=NULL,lease_until=NULL,last_sync_error=p_error,
  state=CASE WHEN q.scheduled_operation='send' THEN CASE WHEN p_error IS NULL AND p_message IS NOT NULL THEN 'sent' WHEN p_ambiguous THEN 'unknown' ELSE 'scheduled' END ELSE state END,
  telegram_message_id=CASE WHEN q.scheduled_operation='send' AND p_error IS NULL THEN p_message ELSE telegram_message_id END,
  synced_revision=CASE WHEN p_error IS NULL THEN greatest(synced_revision,p_revision) ELSE synced_revision END WHERE id=o.id;
 IF p_error IS NULL AND o.revision>p_revision AND q.scheduled_operation<>'expire' THEN PERFORM queue_scheduled_message(o.id,'edit'); END IF;
END $$;

-- A crashed/ambiguous SEND cannot safely be retried: Telegram has no
-- idempotency token. Edits can be retried against the stored original ID.
CREATE FUNCTION public.recover_scheduled_deliveries() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 UPDATE scheduled_message_occurrences SET state='unknown',last_sync_error='Send interrupted; verify Telegram before reconciliation',delivery_lease=NULL,lease_until=NULL
  WHERE state='sending' AND lease_until<clock_timestamp();
 UPDATE notification_deliveries q SET status='failed',last_error='Send outcome unknown; automatic resend disabled' FROM scheduled_message_occurrences o WHERE q.scheduled_occurrence_id=o.id AND q.scheduled_operation='send' AND o.state='unknown' AND q.status IN ('pending','processing');
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('save_scheduled_template','create_scheduled_schedule','change_scheduled_occurrence','request_scheduled_send','respond_scheduled_attendance','begin_scheduled_delivery','finish_scheduled_delivery','recover_scheduled_deliveries') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
