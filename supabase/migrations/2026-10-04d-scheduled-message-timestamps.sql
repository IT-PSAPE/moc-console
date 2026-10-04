BEGIN;

-- Preserve existing instants, message IDs, occurrence identities and responses.
ALTER TABLE public.scheduled_message_schedules ADD COLUMN send_time time NOT NULL DEFAULT '00:00';
ALTER TABLE public.scheduled_message_occurrences ADD COLUMN migrated_send_at timestamptz;
UPDATE public.scheduled_message_occurrences o SET migrated_send_at=o.send_on::timestamp AT TIME ZONE s.timezone FROM public.scheduled_message_schedules s WHERE s.id=o.schedule_id;
ALTER TABLE public.scheduled_message_occurrences ALTER COLUMN send_on TYPE timestamptz USING migrated_send_at;
ALTER TABLE public.scheduled_message_occurrences DROP COLUMN migrated_send_at;
ALTER TABLE public.scheduled_message_schedules DROP CONSTRAINT scheduled_message_schedules_expiry_hours_check;
ALTER TABLE public.scheduled_message_schedules ALTER COLUMN expiry_hours TYPE numeric;
ALTER TABLE public.scheduled_message_schedules ADD CONSTRAINT scheduled_message_schedules_expiry_hours_check CHECK (expiry_hours BETWEEN (1.0/60) AND 8760);
CREATE INDEX scheduled_occurrences_due ON public.scheduled_message_occurrences(send_on) WHERE state='scheduled';

UPDATE public.scheduled_message_templates SET fields=fields-'date'-'time';
UPDATE public.scheduled_message_schedules SET fields=fields-'date'-'time';
UPDATE public.scheduled_message_occurrences SET fields=fields-'date'-'time',revision=revision+1;
DELETE FROM public.scheduled_message_series_changes WHERE field IN ('date','time');
DELETE FROM public.scheduled_message_sessions WHERE kind='admin';

CREATE OR REPLACE FUNCTION private.scheduled_validate_fields(p_type text,p_fields jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE k text; v jsonb; BEGIN
 IF p_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR coalesce(length(trim(p_fields->>'title')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid message title'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF jsonb_typeof(v)<>'string' OR k NOT IN ('title','instructions') THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF k='instructions' AND length(p_fields->>k)>2000 THEN RAISE EXCEPTION 'Instructions too long'; END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_scheduled_schedule(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE t scheduled_message_templates; v_id uuid; v_fields jsonb; zone text:=coalesce(p_data->>'timezone','Africa/Johannesburg'); v_send timestamptz; v_expiry timestamptz; v_hours numeric; BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO t FROM scheduled_message_templates WHERE id=(p_data->>'templateId')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 IF p_data ? 'fields' AND jsonb_typeof(p_data->'fields') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Message fields must be an object'; END IF;
 v_fields:=t.fields || coalesce(p_data->'fields','{}'::jsonb); PERFORM scheduled_validate_fields(t.message_type,v_fields);
 PERFORM scheduled_validate_destination(p_workspace,p_data->>'groupChatId',(p_data->>'threadId')::bigint);
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 v_send:=CASE WHEN p_data->>'startsOn' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN (p_data->>'startsOn')::timestamptz ELSE (p_data->>'startsOn')::timestamp AT TIME ZONE zone END;
 v_expiry:=coalesce((p_data->>'expiresAt')::timestamptz,v_send+make_interval(secs=>round(coalesce((p_data->>'expiryHours')::numeric,72)*3600)::double precision));
 v_hours:=extract(epoch FROM (v_expiry-v_send))/3600;
 IF v_send IS NULL OR v_expiry IS NULL OR v_hours NOT BETWEEN (1.0/60) AND 8760 THEN RAISE EXCEPTION 'Expiry must be 1 minute to 8760 hours after send'; END IF;
 INSERT INTO scheduled_message_schedules(workspace_id,template_id,group_chat_id,thread_id,starts_on,send_time,until_on,timezone,frequency,auto_send,expiry_hours,fields,body,message_type,audience,require_arrival,attendance_groups)
 VALUES(p_workspace,t.id,p_data->>'groupChatId',(p_data->>'threadId')::bigint,(v_send AT TIME ZONE zone)::date,(v_send AT TIME ZONE zone)::time,(p_data->>'untilOn')::date,zone,p_data->>'frequency',coalesce((p_data->>'autoSend')::boolean,true),v_hours,v_fields,t.body,t.message_type,t.audience,t.require_arrival,t.attendance_groups) RETURNING id INTO v_id;
 PERFORM materialize_scheduled_messages(v_id); RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
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
   INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,attendance_groups)
   VALUES(s.workspace_id,s.id,d,((d+s.send_time) AT TIME ZONE s.timezone),((d+s.send_time) AT TIME ZONE s.timezone)+make_interval(secs=>round(h*3600)::double precision),f,s.body,s.message_type,s.audience,s.require_arrival,g) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.change_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_field text,p_value text,p_scope text DEFAULT 'occurrence') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; target scheduled_message_occurrences; f jsonb; groups jsonb; h numeric; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.expires_at<=clock_timestamp() OR o.state IN ('unknown','cancelled','sending') THEN RAISE EXCEPTION 'Message is no longer editable'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before applying'; END IF;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id FOR UPDATE;
 IF p_scope NOT IN ('occurrence','future','series') OR (s.frequency='once' AND p_scope<>'occurrence') THEN RAISE EXCEPTION 'Invalid edit scope'; END IF;
 IF p_field IN ('sendOn','expiresAt') AND p_scope<>'occurrence' THEN RAISE EXCEPTION 'Date changes apply only to this occurrence; use expiry hours for the series'; END IF;
 IF p_field='sendOn' AND o.state<>'scheduled' THEN RAISE EXCEPTION 'A sent message cannot be rescheduled'; END IF;
 IF p_field='expiryHours' THEN
  h:=p_value::numeric; IF h NOT BETWEEN (1.0/60) AND 8760 THEN RAISE EXCEPTION 'Expiry must be 1 minute to 8760 hours'; END IF;
 ELSIF p_field='expiresAt' THEN
  IF p_value::timestamptz<=clock_timestamp() OR p_value::timestamptz<=o.send_on THEN RAISE EXCEPTION 'Expiry must be after the send time and in the future'; END IF;
 ELSIF p_field='sendOn' THEN
  IF p_value::timestamptz>=o.expires_at THEN RAISE EXCEPTION 'Send time must precede expiry'; END IF;
 ELSIF p_field='attendanceGroups' THEN
  groups:=p_value::jsonb; PERFORM scheduled_validate_groups(o.message_type,groups);
 ELSE
  f:=jsonb_set(o.fields,ARRAY[p_field],to_jsonb(p_value),true); PERFORM scheduled_validate_fields(o.message_type,f);
 END IF;
 -- Reject removal if any affected, live occurrence has a response in a removed group.
 IF p_field='attendanceGroups' AND EXISTS(
  SELECT 1 FROM scheduled_message_occurrences x JOIN scheduled_message_responses r ON r.occurrence_id=x.id
  WHERE x.schedule_id=s.id AND x.expires_at>clock_timestamp() AND x.state IN ('scheduled','sent')
   AND (x.id=o.id OR p_scope='series' OR (p_scope='future' AND x.occurrence_on>=o.occurrence_on))
   AND r.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(groups) n WHERE n->>'id'=r.group_id)
 ) THEN RAISE EXCEPTION 'Cannot remove an attendance group already used by a response'; END IF;
 IF p_scope='series' THEN
  DELETE FROM scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field;
  IF p_field='expiryHours' THEN UPDATE scheduled_message_schedules SET expiry_hours=h WHERE id=s.id;
  ELSIF p_field='attendanceGroups' THEN UPDATE scheduled_message_schedules SET attendance_groups=groups WHERE id=s.id;
  ELSE UPDATE scheduled_message_schedules SET fields=jsonb_set(fields,ARRAY[p_field],to_jsonb(p_value),true) WHERE id=s.id; END IF;
 ELSIF p_scope='future' THEN
  DELETE FROM scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field AND effective_on>=o.occurrence_on;
  INSERT INTO scheduled_message_series_changes(schedule_id,effective_on,field,value) VALUES(s.id,o.occurrence_on,p_field,p_value);
 END IF;
 FOR target IN SELECT * FROM scheduled_message_occurrences WHERE schedule_id=s.id AND expires_at>clock_timestamp() AND state IN ('scheduled','sent') AND
  (id=o.id OR p_scope='series' OR (p_scope='future' AND occurrence_on>=o.occurrence_on)) ORDER BY occurrence_on FOR UPDATE LOOP
  IF p_field='attendanceGroups' AND EXISTS(SELECT 1 FROM scheduled_message_responses r WHERE r.occurrence_id=target.id AND r.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(groups) n WHERE n->>'id'=r.group_id)) THEN
   RAISE EXCEPTION 'Cannot remove an attendance group already used by a response';
  END IF;
  UPDATE scheduled_message_occurrences SET fields=CASE WHEN p_field NOT IN ('sendOn','expiresAt','expiryHours','attendanceGroups') THEN jsonb_set(fields,ARRAY[p_field],to_jsonb(p_value),true) ELSE fields END,
   attendance_groups=CASE WHEN p_field='attendanceGroups' THEN groups ELSE attendance_groups END,
   send_on=CASE WHEN p_field='sendOn' THEN p_value::timestamptz ELSE send_on END,
   expires_at=CASE WHEN p_field='expiresAt' THEN p_value::timestamptz WHEN p_field='expiryHours' THEN send_on+make_interval(secs=>round(h*3600)::double precision) ELSE expires_at END,
   revision=revision+1 WHERE id=target.id;
  IF target.state='sent' THEN PERFORM queue_scheduled_message(target.id,'edit'); END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_scheduled_messages() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE item record; BEGIN
 PERFORM materialize_scheduled_messages();
 FOR item IN SELECT o.id FROM scheduled_message_occurrences o JOIN scheduled_message_schedules s ON s.id=o.schedule_id WHERE o.state='scheduled' AND s.enabled AND s.auto_send AND o.send_on <= clock_timestamp() AND o.expires_at>clock_timestamp() LOOP
  PERFORM queue_scheduled_message(item.id,'send');
 END LOOP;
 FOR item IN SELECT id FROM scheduled_message_occurrences WHERE state='sent' AND expires_at<=clock_timestamp() LOOP
  PERFORM queue_scheduled_message(item.id,'expire');
 END LOOP;
 DELETE FROM scheduled_message_sessions WHERE expires_at<=clock_timestamp();
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
   SELECT o.id,u.id,trim(concat_ws(' ', u.name, u.surname)) FROM workspace_users w JOIN users u ON u.id=w.user_id WHERE w.workspace_id=o.workspace_id AND w.member_type_id=ANY(o.audience) AND o.message_type='pre_attendance' ON CONFLICT DO NOTHING;
 END IF;
 UPDATE scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN 'sending' ELSE state END WHERE id=o.id;
 RETURN jsonb_build_object('timezone',s.timezone,'occurrence',to_jsonb(o),'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY name,user_id),'[]') FROM scheduled_message_responses r WHERE occurrence_id=o.id),'expired',o.expires_at<=clock_timestamp());
END $$;

-- Refresh sent cards from the same persisted expiry without replacing responses.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT id FROM public.scheduled_message_occurrences WHERE state='sent' AND expires_at>clock_timestamp() LOOP
  PERFORM private.queue_scheduled_message(item.id,'edit');
 END LOOP;
END $$;
COMMIT;
