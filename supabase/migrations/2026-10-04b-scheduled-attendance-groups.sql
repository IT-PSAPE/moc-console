BEGIN;

ALTER TABLE public.scheduled_message_templates ADD COLUMN attendance_groups jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.scheduled_message_schedules ADD COLUMN attendance_groups jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.scheduled_message_occurrences ADD COLUMN attendance_groups jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.scheduled_message_responses ADD COLUMN group_id text;

CREATE FUNCTION private.scheduled_validate_groups(p_type text,p_groups jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE item jsonb; n integer; label text; BEGIN
 IF p_groups IS NULL OR jsonb_typeof(p_groups)<>'array' THEN RAISE EXCEPTION 'Attendance groups must be an array'; END IF;
 n:=jsonb_array_length(p_groups);
 IF n NOT IN (0) AND n NOT BETWEEN 2 AND 8 THEN RAISE EXCEPTION 'Attendance groups must be empty or contain 2 to 8 groups'; END IF;
 IF n>0 AND p_type<>'pre_attendance' THEN RAISE EXCEPTION 'Attendance groups require pre_attendance'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
  IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>2 OR NOT item ?& ARRAY['id','label'] THEN RAISE EXCEPTION 'Invalid attendance group'; END IF;
  IF jsonb_typeof(item->'id') IS DISTINCT FROM 'string' OR coalesce(item->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Attendance group ID must be a UUID'; END IF;
  IF jsonb_typeof(item->'label') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Attendance group label must be text'; END IF;
  label:=item->>'label';
  IF label IS NULL OR label<>btrim(label) OR length(label) NOT BETWEEN 1 AND 40 OR position(chr(10) in label)>0 OR position(chr(13) in label)>0 OR position(chr(9) in label)>0 THEN RAISE EXCEPTION 'Attendance group labels must be trimmed and 1 to 40 characters'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT lower(value->>'label')) FROM jsonb_array_elements(p_groups) AS groups(value))<>n THEN RAISE EXCEPTION 'Attendance group labels must be unique'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_groups) AS groups(value))<>n THEN RAISE EXCEPTION 'Attendance group IDs must be unique'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_scheduled_template(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_id uuid; v_type text:=p_data->>'messageType'; v_audience uuid[]; v_groups jsonb:=coalesce(p_data->'attendanceGroups','[]'::jsonb); BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF v_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 PERFORM scheduled_validate_fields(v_type,p_data->'fields'); PERFORM scheduled_validate_groups(v_type,v_groups);
 SELECT coalesce(array_agg(value::uuid),'{}') INTO v_audience FROM jsonb_array_elements_text(coalesce(p_data->'audience','[]'));
 IF EXISTS(SELECT 1 FROM unnest(v_audience) a WHERE NOT EXISTS(SELECT 1 FROM workspace_member_types WHERE id=a AND workspace_id=p_workspace)) THEN RAISE EXCEPTION 'Invalid member type'; END IF;
 IF v_type='pre_attendance' AND cardinality(v_audience)=0 THEN RAISE EXCEPTION 'Select at least one member type'; END IF;
 IF p_data ? 'id' THEN
  UPDATE scheduled_message_templates SET name=p_data->>'name',message_type=v_type,body=p_data->>'body',fields=p_data->'fields',audience=v_audience,require_arrival=coalesce((p_data->>'requireArrival')::boolean,false),attendance_groups=v_groups
  WHERE id=(p_data->>'id')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 ELSE
  INSERT INTO scheduled_message_templates(id,workspace_id,name,message_type,body,fields,audience,require_arrival,attendance_groups)
  VALUES(coalesce((p_data->>'creationId')::uuid,gen_random_uuid()),p_workspace,p_data->>'name',v_type,p_data->>'body',p_data->'fields',v_audience,coalesce((p_data->>'requireArrival')::boolean,false),v_groups)
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,message_type=excluded.message_type,body=excluded.body,fields=excluded.fields,audience=excluded.audience,require_arrival=excluded.require_arrival,attendance_groups=excluded.attendance_groups
  WHERE scheduled_message_templates.workspace_id=p_workspace AND scheduled_message_templates.deleted_at IS NULL RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 END IF;
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_scheduled_schedule(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE t scheduled_message_templates; v_id uuid; v_fields jsonb; zone text:=coalesce(p_data->>'timezone','Africa/Johannesburg'); BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO t FROM scheduled_message_templates WHERE id=(p_data->>'templateId')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 IF p_data ? 'fields' AND jsonb_typeof(p_data->'fields') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Message fields must be an object'; END IF;
 v_fields:=t.fields || coalesce(p_data->'fields','{}'::jsonb); PERFORM scheduled_validate_fields(t.message_type,v_fields);
 PERFORM scheduled_validate_destination(p_workspace,p_data->>'groupChatId',(p_data->>'threadId')::bigint);
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 IF coalesce((p_data->>'autoSend')::boolean,true) AND coalesce((p_data->>'expiryHours')::integer,72)<24 THEN RAISE EXCEPTION 'Automatic schedules need at least 24 expiry hours for the daily worker; use manual delivery for shorter windows'; END IF;
 INSERT INTO scheduled_message_schedules(workspace_id,template_id,group_chat_id,thread_id,starts_on,until_on,timezone,frequency,auto_send,expiry_hours,fields,body,message_type,audience,require_arrival,attendance_groups)
 VALUES(p_workspace,t.id,p_data->>'groupChatId',(p_data->>'threadId')::bigint,(p_data->>'startsOn')::date,(p_data->>'untilOn')::date,zone,p_data->>'frequency',coalesce((p_data->>'autoSend')::boolean,true),coalesce((p_data->>'expiryHours')::integer,72),v_fields,t.body,t.message_type,t.audience,t.require_arrival,t.attendance_groups) RETURNING id INTO v_id;
 PERFORM materialize_scheduled_messages(v_id); RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE s scheduled_message_schedules; d date; f jsonb; g jsonb; h integer; c record; local_today date; BEGIN
 FOR s IN SELECT * FROM scheduled_message_schedules WHERE enabled AND (p_schedule IS NULL OR id=p_schedule) LOOP
  local_today := (clock_timestamp() AT TIME ZONE s.timezone)::date;
  FOR d IN SELECT day::date FROM generate_series(CASE WHEN s.frequency='once' THEN s.starts_on ELSE greatest(s.starts_on,local_today-30) END::timestamp,CASE WHEN s.frequency='once' THEN s.starts_on ELSE least(coalesce(s.until_on,local_today+32),local_today+32) END::timestamp,interval '1 day') day LOOP
   IF s.frequency='weekly' AND extract(isodow FROM d)<>extract(isodow FROM s.starts_on) THEN CONTINUE; END IF;
   IF s.frequency='weekdays' AND extract(isodow FROM d)>5 THEN CONTINUE; END IF;
   IF s.frequency='monthly' AND extract(day FROM d)<>extract(day FROM s.starts_on) THEN CONTINUE; END IF;
   f:=s.fields; g:=s.attendance_groups; h:=s.expiry_hours;
   FOR c IN SELECT DISTINCT ON(field) field,value FROM scheduled_message_series_changes WHERE schedule_id=s.id AND effective_on<=d ORDER BY field,effective_on DESC,id DESC LOOP
    IF c.field='expiryHours' THEN h:=c.value::integer; ELSIF c.field='attendanceGroups' THEN g:=c.value::jsonb; ELSE f:=jsonb_set(f,ARRAY[c.field],to_jsonb(c.value),true); END IF;
   END LOOP;
   IF ((d::timestamp AT TIME ZONE s.timezone)+make_interval(hours=>h))<=clock_timestamp() THEN CONTINUE; END IF;
   INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,attendance_groups)
   VALUES(s.workspace_id,s.id,d,d,(d::timestamp AT TIME ZONE s.timezone)+make_interval(hours=>h),f,s.body,s.message_type,s.audience,s.require_arrival,g) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;

-- The attendance group field is an ordered JSON snapshot. Keep occurrence then
-- schedule lock order, matching the existing editor and delivery paths.
CREATE OR REPLACE FUNCTION public.change_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_field text,p_value text,p_scope text DEFAULT 'occurrence') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; target scheduled_message_occurrences; f jsonb; groups jsonb; h integer; BEGIN
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
   send_on=CASE WHEN p_field='sendOn' THEN p_value::date ELSE send_on END,
   expires_at=CASE WHEN p_field='expiresAt' THEN p_value::timestamptz WHEN p_field='expiryHours' THEN (send_on::timestamp AT TIME ZONE s.timezone)+make_interval(hours=>h) ELSE expires_at END,
   revision=revision+1 WHERE id=target.id;
  IF target.state='sent' THEN PERFORM queue_scheduled_message(target.id,'edit'); END IF;
 END LOOP;
END $$;

DROP FUNCTION public.respond_scheduled_attendance(uuid,uuid,integer,text,text);
CREATE FUNCTION public.respond_scheduled_attendance(p_actor uuid,p_id uuid,p_revision integer,p_status text,p_arrival text DEFAULT NULL,p_group text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF o.expires_at<=clock_timestamp() OR o.state<>'sent' OR o.message_type<>'pre_attendance' THEN RAISE EXCEPTION 'Attendance is closed'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before responding'; END IF;
 IF NOT EXISTS(SELECT 1 FROM workspace_users WHERE workspace_id=o.workspace_id AND user_id=p_actor) OR NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id=p_actor) THEN RAISE EXCEPTION 'You are not in this attendance roster'; END IF;
 IF p_status NOT IN ('attending','not_attending') THEN RAISE EXCEPTION 'Invalid attendance status'; END IF;
 IF jsonb_array_length(o.attendance_groups)=0 AND p_group IS NOT NULL THEN RAISE EXCEPTION 'This message has no attendance groups'; END IF;
 IF p_status='attending' THEN
  IF jsonb_array_length(o.attendance_groups)>0 AND (p_group IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.attendance_groups) g WHERE g->>'id'=p_group)) THEN RAISE EXCEPTION 'Choose a valid attendance group'; END IF;
  IF o.require_arrival AND (p_arrival IS NULL OR NOT (p_arrival ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) THEN RAISE EXCEPTION 'An arrival time is required'; END IF;
 ELSE p_group:=NULL; p_arrival:=NULL;
 END IF;
 UPDATE scheduled_message_responses SET status=p_status,arrival_time=p_arrival,group_id=p_group,acknowledged_revision=o.revision WHERE occurrence_id=o.id AND user_id=p_actor;
 UPDATE scheduled_message_occurrences SET revision=revision+1 WHERE id=o.id; PERFORM queue_scheduled_message(o.id,'edit');
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname='scheduled_validate_groups' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); END LOOP;
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('save_scheduled_template','create_scheduled_schedule','change_scheduled_occurrence','respond_scheduled_attendance','materialize_scheduled_messages') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
