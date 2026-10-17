-- Direct scheduled Telegram messages with explicit, ordered attendee IDs.
ALTER TABLE public.scheduled_message_schedules ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE public.scheduled_message_schedules ADD COLUMN IF NOT EXISTS attendee_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL;
ALTER TABLE public.scheduled_message_occurrences ADD COLUMN IF NOT EXISTS attendee_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL;

CREATE OR REPLACE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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
  RETURN jsonb_build_object('timezone',s.timezone,'occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY coalesce(array_position(o.attendee_ids,r.user_id),2147483647),name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',true);
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
   SELECT o.id,u.id,trim(concat_ws(' ', u.name, u.surname)) FROM unnest(o.attendee_ids) WITH ORDINALITY chosen(user_id,ordinality) JOIN workspace_users w ON w.user_id=chosen.user_id AND w.workspace_id=o.workspace_id JOIN users u ON u.id=w.user_id WHERE o.message_type='pre_attendance'
   UNION ALL
   SELECT o.id,u.id,trim(concat_ws(' ', u.name, u.surname)) FROM workspace_users w JOIN users u ON u.id=w.user_id WHERE w.workspace_id=o.workspace_id AND w.member_type_id=ANY(o.audience) AND o.message_type='pre_attendance' AND cardinality(o.attendee_ids)=0 AND nullif(btrim(u.telegram_chat_id),'') IS NOT NULL
   ON CONFLICT DO NOTHING;
 END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN 'sending' ELSE state END WHERE id=o.id;
 RETURN jsonb_build_object('timezone',s.timezone,'occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY coalesce(array_position(o.attendee_ids,r.user_id),2147483647),name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',o.expires_at<=clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.create_scheduled_schedule(p_actor uuid, p_workspace uuid, p_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $_$
DECLARE t scheduled_message_templates; v_id uuid; v_fields jsonb; v_type text; v_body text; v_audience uuid[]:='{}'; v_attendees uuid[]:='{}'; v_arrival boolean:=false; v_groups jsonb:='[]'; zone text:=coalesce(p_data->>'timezone','Africa/Johannesburg'); v_send timestamptz; v_expiry timestamptz; v_hours numeric;
BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF p_data ? 'templateId' THEN
  SELECT * INTO t FROM scheduled_message_templates WHERE id=(p_data->>'templateId')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
  v_fields:=t.fields || coalesce(p_data->'fields','{}'::jsonb); v_type:=t.message_type; v_body:=t.body; v_audience:=t.audience; v_arrival:=t.require_arrival; v_groups:=t.attendance_groups;
 ELSE
  v_type:=p_data->>'messageType'; v_body:=p_data->>'body'; v_fields:=p_data->'fields'; v_arrival:=coalesce((p_data->>'requireArrival')::boolean,false); v_groups:=coalesce(p_data->'attendanceGroups','[]'::jsonb);
  IF v_type IS NULL OR v_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
  IF v_body IS NULL OR btrim(v_body)='' OR length(v_body)>3000 OR EXISTS(SELECT 1 FROM regexp_matches(v_body,'{{(\w+)}}','g') token WHERE token[1] NOT IN ('title','instructions','date','time')) THEN RAISE EXCEPTION 'Invalid message body'; END IF;
  IF jsonb_typeof(v_fields) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Message fields must be an object'; END IF;
  PERFORM scheduled_validate_groups(v_type,v_groups);
  SELECT coalesce(array_agg(value::uuid ORDER BY ordinality),'{}') INTO v_attendees FROM jsonb_array_elements_text(coalesce(p_data->'attendeeIds','[]'::jsonb)) WITH ORDINALITY AS input(value,ordinality);
  IF cardinality(v_attendees)<>cardinality(ARRAY(SELECT DISTINCT unnest(v_attendees))) THEN RAISE EXCEPTION 'Attendees cannot be duplicated'; END IF;
  IF v_type='pre_attendance' AND cardinality(v_attendees)=0 THEN RAISE EXCEPTION 'Select at least one attendee'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(v_attendees) AS attendee(user_id) WHERE NOT EXISTS(SELECT 1 FROM workspace_users w WHERE w.workspace_id=p_workspace AND w.user_id=attendee.user_id)) THEN RAISE EXCEPTION 'Every attendee must be a current workspace member'; END IF;
 END IF;
 PERFORM scheduled_validate_fields(v_type,v_fields);
 PERFORM scheduled_validate_destination(p_workspace,p_data->>'groupChatId',(p_data->>'threadId')::bigint);
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 v_send:=CASE WHEN p_data->>'startsOn' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN (p_data->>'startsOn')::timestamptz ELSE (p_data->>'startsOn')::timestamp AT TIME ZONE zone END;
 v_expiry:=coalesce((p_data->>'expiresAt')::timestamptz,v_send+make_interval(secs=>round(coalesce((p_data->>'expiryHours')::numeric,72)*3600)::double precision));
 v_hours:=extract(epoch FROM (v_expiry-v_send))/3600;
 IF v_send IS NULL OR v_expiry IS NULL OR v_hours NOT BETWEEN (1.0/60) AND 8760 THEN RAISE EXCEPTION 'Expiry must be 1 minute to 8760 hours after send'; END IF;
 INSERT INTO scheduled_message_schedules(workspace_id,template_id,attendee_ids,group_chat_id,thread_id,starts_on,send_time,until_on,timezone,frequency,auto_send,expiry_hours,fields,body,message_type,audience,require_arrival,attendance_groups)
 VALUES(p_workspace,t.id,v_attendees,p_data->>'groupChatId',(p_data->>'threadId')::bigint,(v_send AT TIME ZONE zone)::date,(v_send AT TIME ZONE zone)::time,(p_data->>'untilOn')::date,zone,p_data->>'frequency',coalesce((p_data->>'autoSend')::boolean,true),v_hours,v_fields,v_body,v_type,v_audience,v_arrival,v_groups) RETURNING id INTO v_id;
 PERFORM materialize_scheduled_messages(v_id); RETURN v_id;
END $_$;

CREATE OR REPLACE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
DECLARE s scheduled_message_schedules; d date; f jsonb; g jsonb; h numeric; c record; local_today date; BEGIN
 FOR s IN SELECT * FROM scheduled_message_schedules WHERE enabled AND (p_schedule IS NULL OR id=p_schedule) LOOP
  local_today := (clock_timestamp() AT TIME ZONE s.timezone)::date;
  FOR d IN SELECT day::date FROM generate_series(CASE WHEN s.frequency='once' THEN s.starts_on ELSE greatest(s.starts_on,local_today-30) END::timestamp,CASE WHEN s.frequency='once' THEN s.starts_on ELSE least(coalesce(s.until_on,local_today+32),local_today+32) END::timestamp,interval '1 day') day LOOP
   IF s.frequency='weekly' AND extract(isodow FROM d)<>extract(isodow FROM s.starts_on) THEN CONTINUE; END IF;
   IF s.frequency='weekdays' AND extract(isodow FROM d)>5 THEN CONTINUE; END IF;
   IF s.frequency='monthly' AND extract(day FROM d)<>extract(day FROM s.starts_on) THEN CONTINUE; END IF;
   f:=s.fields; g:=s.attendance_groups; h:=s.expiry_hours;
   FOR c IN SELECT DISTINCT ON(field) field,value FROM scheduled_message_series_changes WHERE schedule_id=s.id AND effective_on<=d ORDER BY field,effective_on DESC,id DESC LOOP
    IF c.field='expiryHours' THEN h:=c.value::numeric; ELSIF c.field='attendanceGroups' THEN g:=c.value::jsonb; ELSE f:=jsonb_set(f,ARRAY[c.field],to_jsonb(c.value),true); END IF;
   END LOOP;
   IF (((d+s.send_time) AT TIME ZONE s.timezone)+make_interval(secs=>round(h*3600)::double precision))<=clock_timestamp() THEN CONTINUE; END IF;
   INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,attendee_ids,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,attendance_groups)
   VALUES(s.workspace_id,s.id,s.attendee_ids,d,((d+s.send_time) AT TIME ZONE s.timezone),((d+s.send_time) AT TIME ZONE s.timezone)+make_interval(secs=>round(h*3600)::double precision),f,s.body,s.message_type,s.audience,s.require_arrival,g) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;
