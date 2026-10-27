-- Scheduled messages v2: retire saved templates and expiry-driven lifecycle,
-- while preserving the old source needed to finish existing recurring series.
-- Apply transactionally after item-discussion.sql.

CREATE TABLE IF NOT EXISTS moc_private.scheduled_message_v2_legacy_archive (
  source_kind text NOT NULL,
  source_id text NOT NULL,
  data jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (source_kind, source_id)
);
REVOKE ALL ON TABLE moc_private.scheduled_message_v2_legacy_archive FROM PUBLIC, moc_app, moc_public, moc_worker;

-- This archive is a one-way preservation source. ON CONFLICT makes a rerun
-- retain the original pre-migration payload instead of archiving v2 values.
DO $$
BEGIN
 IF to_regclass('public.scheduled_message_templates') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_schedules'::regclass AND attname='template_id' AND NOT attisdropped) THEN
  EXECUTE $q$INSERT INTO moc_private.scheduled_message_v2_legacy_archive(source_kind,source_id,data)
   SELECT 'template',id::text,to_jsonb(t) FROM public.scheduled_message_templates t ON CONFLICT DO NOTHING$q$;
  EXECUTE $q$INSERT INTO moc_private.scheduled_message_v2_legacy_archive(source_kind,source_id,data)
   SELECT 'schedule',id::text,to_jsonb(s) FROM public.scheduled_message_schedules s ON CONFLICT DO NOTHING$q$;
  EXECUTE $q$INSERT INTO moc_private.scheduled_message_v2_legacy_archive(source_kind,source_id,data)
   SELECT 'occurrence',id::text,to_jsonb(o) FROM public.scheduled_message_occurrences o ON CONFLICT DO NOTHING$q$;
  EXECUTE $q$INSERT INTO moc_private.scheduled_message_v2_legacy_archive(source_kind,source_id,data)
   SELECT 'series_change',id::text,to_jsonb(c) FROM public.scheduled_message_series_changes c ON CONFLICT DO NOTHING$q$;
 END IF;
END $$;

-- Replace legacy validators before retiring their fields.
CREATE OR REPLACE FUNCTION moc_private.scheduled_validate_groups(p_type text,p_groups jsonb) RETURNS void
LANGUAGE plpgsql SET search_path='public','pg_temp' AS $$
DECLARE item jsonb; n integer; label text;
BEGIN
 IF p_type NOT IN ('announcement','attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 IF p_groups IS NULL OR jsonb_typeof(p_groups)<>'array' THEN RAISE EXCEPTION 'Attendance groups must be an array'; END IF;
 n:=jsonb_array_length(p_groups);
 IF n NOT IN (0) AND n NOT BETWEEN 2 AND 8 THEN RAISE EXCEPTION 'Attendance groups must be empty or contain 2 to 8 groups'; END IF;
 IF n>0 AND p_type<>'attendance' THEN RAISE EXCEPTION 'Attendance groups require attendance messages'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
  IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>2 OR NOT item ?& ARRAY['id','label'] THEN RAISE EXCEPTION 'Invalid attendance group'; END IF;
  IF jsonb_typeof(item->'id') IS DISTINCT FROM 'string' OR coalesce(item->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Attendance group ID must be a UUID'; END IF;
  IF jsonb_typeof(item->'label') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Attendance group label must be text'; END IF;
  label:=item->>'label';
  IF label IS NULL OR label<>btrim(label) OR length(label) NOT BETWEEN 1 AND 40 OR label~'[\n\r\t]' THEN RAISE EXCEPTION 'Attendance group labels must be trimmed and 1 to 40 characters'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT lower(value->>'label')) FROM jsonb_array_elements(p_groups) AS groups(value))<>n THEN RAISE EXCEPTION 'Attendance group labels must be unique'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_groups) AS groups(value))<>n THEN RAISE EXCEPTION 'Attendance group IDs must be unique'; END IF;
END $$;

-- The app role represents the request identity set by the API transaction.
-- Keep worker calls explicitly actor-addressed for trusted background/admin
-- paths, but do not let a moc_app caller choose a different p_actor value.
CREATE OR REPLACE FUNCTION moc_private.scheduled_actor_context_matches(p_actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='pg_catalog' AS $$
 SELECT CASE WHEN current_setting('role',true)='moc_app'
  THEN p_actor IS NOT DISTINCT FROM moc_private.actor_id()
  ELSE true END
$$;
REVOKE ALL ON FUNCTION moc_private.scheduled_actor_context_matches(uuid) FROM PUBLIC,moc_app,moc_public,moc_worker;

CREATE OR REPLACE FUNCTION moc_private.scheduled_validate_body(p_type text,p_body text) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path='pg_catalog' AS $$
DECLARE token text; prefix text; date_value text; token_start integer; scan_from integer:=1;
BEGIN
 IF p_type NOT IN ('announcement','attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 IF p_body IS NULL OR btrim(p_body)='' OR length(p_body)>3000 THEN RAISE EXCEPTION 'Message must contain 1 to 3000 characters'; END IF;
 FOR token IN SELECT (regexp_matches(p_body,'\{\{([^{}]*)\}\}','g'))[1] LOOP
  token_start:=scan_from+strpos(substring(p_body FROM scan_from),'{{'||token||'}}')-1;
  prefix:=substring(p_body FROM 1 FOR token_start-1);
  IF strpos(reverse(prefix),'<')>0 AND (strpos(reverse(prefix),'>')=0 OR strpos(reverse(prefix),'<')<strpos(reverse(prefix),'>')) THEN RAISE EXCEPTION 'Date and time values must appear in message text, not HTML attributes'; END IF;
  scan_from:=token_start+length(token)+4;
  IF token ~ '^date:[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
   date_value:=substr(token,6);
   BEGIN IF date_value::date::text<>date_value THEN RAISE EXCEPTION 'Invalid calendar date'; END IF;
   EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid calendar date'; END;
  ELSIF token !~ '^time:([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid message content token';
  END IF;
 END LOOP;
 IF regexp_replace(p_body,'\{\{(date:[0-9]{4}-[0-9]{2}-[0-9]{2}|time:([01][0-9]|2[0-3]):[0-5][0-9])\}\}','','g') LIKE '%{{%'
   OR regexp_replace(p_body,'\{\{(date:[0-9]{4}-[0-9]{2}-[0-9]{2}|time:([01][0-9]|2[0-3]):[0-5][0-9])\}\}','','g') LIKE '%}}%' THEN RAISE EXCEPTION 'Invalid message content token'; END IF;
END $$;

CREATE OR REPLACE FUNCTION moc_private.render_legacy_scheduled_body(p_body text,p_fields jsonb,p_expires timestamptz,p_zone text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='pg_catalog' AS $$
DECLARE result text; date_value text:=''; time_value text:=''; local_expiry timestamp; title_value text; instructions_value text;
 line text; token_match text[]; token_count integer; all_empty boolean; kept text[]:='{}'; compact text[]:='{}'; value text; rendered_line text;
BEGIN
 IF p_expires IS NOT NULL AND p_zone IS NOT NULL THEN
  local_expiry:=p_expires AT TIME ZONE p_zone;
  date_value:=lpad(((extract(year FROM local_expiry)::integer-1983)::text),2,'0')||to_char(local_expiry,'MMDD');
  time_value:=to_char(local_expiry,'HH24:MI');
 END IF;
 title_value:=replace(replace(replace(coalesce(p_fields->>'title',''),'&','&amp;'),'<','&lt;'),'>','&gt;');
 instructions_value:=replace(replace(replace(coalesce(p_fields->>'instructions',''),'&','&amp;'),'<','&lt;'),'>','&gt;');
 FOREACH line IN ARRAY regexp_split_to_array(coalesce(p_body,''),E'\n') LOOP
  token_count:=0; all_empty:=true;
  FOR token_match IN SELECT regexp_matches(line,'\{\{(\w+)\}\}','g') LOOP
   token_count:=token_count+1;
   value:=CASE token_match[1] WHEN 'title' THEN title_value WHEN 'instructions' THEN instructions_value WHEN 'date' THEN date_value WHEN 'time' THEN time_value ELSE NULL END;
   IF value IS NOT NULL AND value<>'' THEN all_empty:=false; END IF;
  END LOOP;
  IF token_count>0 AND all_empty THEN CONTINUE; END IF;
  rendered_line:=replace(line,'{{title}}',title_value);
  rendered_line:=replace(rendered_line,'{{instructions}}',instructions_value);
  rendered_line:=replace(rendered_line,'{{date}}',date_value);
  rendered_line:=replace(rendered_line,'{{time}}',time_value);
  kept:=array_append(kept,rendered_line);
 END LOOP;
 -- Match renderTemplate: collapse blank lines and trim leading/trailing ones.
 FOREACH line IN ARRAY kept LOOP
  IF btrim(line)='' AND (cardinality(compact)=0 OR btrim(compact[cardinality(compact)])='') THEN CONTINUE; END IF;
  compact:=array_append(compact,line);
 END LOOP;
 WHILE cardinality(compact)>0 AND btrim(compact[cardinality(compact)])='' LOOP compact:=compact[1:cardinality(compact)-1]; END LOOP;
 RETURN array_to_string(compact,E'\n');
END $$;

CREATE OR REPLACE FUNCTION moc_private.scheduled_legacy_source(p_schedule uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT data FROM moc_private.scheduled_message_v2_legacy_archive
 WHERE source_kind='schedule' AND source_id=p_schedule::text
$$;
REVOKE ALL ON FUNCTION moc_private.scheduled_legacy_source(uuid) FROM PUBLIC,moc_app,moc_public,moc_worker;

-- Disable audit triggers while normalizing old rows. Existing activity and
-- delivery records remain byte-for-byte intact.
ALTER TABLE public.scheduled_message_occurrences DISABLE TRIGGER record_item_activity;
ALTER TABLE public.scheduled_message_occurrences DISABLE TRIGGER record_item_deletion_activity;
ALTER TABLE public.scheduled_message_schedules DISABLE TRIGGER record_schedule_activity;
ALTER TABLE public.notification_deliveries DISABLE TRIGGER record_scheduled_delivery_activity;

ALTER TABLE public.scheduled_message_schedules
  ADD COLUMN IF NOT EXISTS follow_up_minutes integer,
  ADD COLUMN IF NOT EXISTS legacy_source_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.scheduled_message_occurrences
  ADD COLUMN IF NOT EXISTS post_role text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS parent_occurrence_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_closed boolean NOT NULL DEFAULT false;
ALTER TABLE public.scheduled_message_responses
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_schedules'::regclass AND attname='template_id' AND NOT attisdropped) THEN
  UPDATE public.scheduled_message_schedules SET legacy_source_active=true WHERE id IN (SELECT source_id::uuid FROM moc_private.scheduled_message_v2_legacy_archive WHERE source_kind='schedule');
 END IF;
END $$;
UPDATE public.scheduled_message_schedules SET message_type='attendance' WHERE message_type='pre_attendance';
UPDATE public.scheduled_message_occurrences SET message_type='attendance' WHERE message_type='pre_attendance';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_occurrences'::regclass AND attname='expires_at' AND NOT attisdropped) THEN
  UPDATE public.scheduled_message_occurrences o
  SET body=moc_private.render_legacy_scheduled_body(a.data->>'body',a.data->'fields',(a.data->>'expires_at')::timestamptz,s.timezone)
  FROM moc_private.scheduled_message_v2_legacy_archive a
  JOIN public.scheduled_message_schedules s ON s.id=(a.data->>'schedule_id')::uuid
  WHERE a.source_kind='occurrence' AND a.source_id=o.id::text;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_schedules'::regclass AND attname='template_id' AND NOT attisdropped) THEN
  UPDATE public.scheduled_message_schedules s
  SET body=moc_private.render_legacy_scheduled_body(src.data->>'body',src.data->'fields',
    ((s.starts_on+s.send_time) AT TIME ZONE s.timezone)+make_interval(secs=>round(coalesce((src.data->>'expiry_hours')::numeric,72)*3600)::double precision),s.timezone),
   message_type=CASE WHEN src.data->>'message_type'='pre_attendance' THEN 'attendance' ELSE s.message_type END
  FROM moc_private.scheduled_message_v2_legacy_archive src
  WHERE src.source_kind='schedule' AND src.source_id=s.id::text;
 END IF;
END $$;

-- Old audience-based templates become an explicit roster. Preserve order for
-- already-selected IDs; resolve a template audience once at migration time.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_schedules'::regclass AND attname='audience' AND NOT attisdropped) THEN
  UPDATE public.scheduled_message_schedules s SET attendee_ids=ARRAY(
   SELECT w.user_id FROM public.workspace_users w JOIN public.users u ON u.id=w.user_id
   WHERE w.workspace_id=s.workspace_id AND w.member_type_id=ANY(s.audience) AND nullif(btrim(u.telegram_chat_id),'') IS NOT NULL
   ORDER BY lower(trim(concat_ws(' ',u.name,u.surname))),w.user_id)
  WHERE cardinality(s.attendee_ids)=0 AND cardinality(s.audience)>0;
  UPDATE public.scheduled_message_occurrences o SET attendee_ids=s.attendee_ids FROM public.scheduled_message_schedules s
  WHERE s.id=o.schedule_id AND cardinality(o.attendee_ids)=0 AND cardinality(s.attendee_ids)>0;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scheduled_message_occurrences'::regclass AND attname='expires_at' AND NOT attisdropped) THEN
  UPDATE public.scheduled_message_occurrences SET legacy_closed=true WHERE state='sent' AND expires_at<=clock_timestamp();
  UPDATE public.scheduled_message_occurrences o SET state='cancelled',revision=revision+1,last_sync_error='Cancelled during scheduled-message lifecycle migration',delivery_lease=NULL,lease_until=NULL
   WHERE o.state IN ('scheduled','sending') AND o.expires_at<=clock_timestamp();
  UPDATE public.notification_deliveries d SET status='failed',last_error='Cancelled during scheduled-message lifecycle migration',updated_at=clock_timestamp()
   FROM public.scheduled_message_occurrences o WHERE d.scheduled_occurrence_id=o.id AND d.status IN ('pending','processing')
    AND (d.scheduled_operation='expire' OR o.state='cancelled');
 END IF;
END $$;

ALTER TABLE public.scheduled_message_schedules DROP CONSTRAINT IF EXISTS scheduled_message_schedules_expiry_hours_check;
ALTER TABLE public.scheduled_message_schedules DROP CONSTRAINT IF EXISTS scheduled_message_schedules_workspace_id_template_id_fkey;
ALTER TABLE public.scheduled_message_occurrences DROP CONSTRAINT IF EXISTS scheduled_message_occurrences_schedule_id_occurrence_on_key;
DROP INDEX IF EXISTS public.scheduled_occurrences_active;
ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_scheduled_operation_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_scheduled_operation_check
 CHECK (scheduled_operation = ANY (ARRAY['send','resend','edit','expire','delete']::text[]));

ALTER TABLE public.scheduled_message_schedules
  DROP COLUMN IF EXISTS template_id,
  DROP COLUMN IF EXISTS auto_send,
  DROP COLUMN IF EXISTS expiry_hours,
  DROP COLUMN IF EXISTS fields,
  DROP COLUMN IF EXISTS audience,
  DROP COLUMN IF EXISTS require_arrival;
ALTER TABLE public.scheduled_message_occurrences
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS fields,
  DROP COLUMN IF EXISTS audience,
  DROP COLUMN IF EXISTS require_arrival;
DROP FUNCTION IF EXISTS public.save_scheduled_template(uuid,uuid,jsonb);
DROP FUNCTION IF EXISTS public.delete_scheduled_template(uuid,uuid,uuid);
DROP FUNCTION IF EXISTS moc_private.scheduled_validate_fields(text,jsonb);
DROP TABLE IF EXISTS public.scheduled_message_templates;

CREATE OR REPLACE FUNCTION moc_private.queue_scheduled_message(p_id uuid,p_operation text) RETURNS void
LANGUAGE plpgsql SET search_path='public','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences; s public.scheduled_message_schedules;
BEGIN
 IF p_operation NOT IN ('send','resend','edit','delete') THEN RAISE EXCEPTION 'Unsupported scheduled-message operation'; END IF;
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id;
 SELECT * INTO STRICT s FROM public.scheduled_message_schedules WHERE id=o.schedule_id;
 INSERT INTO public.notification_deliveries(workspace_id,event_key,event_type,scope,destination_key,chat_id,thread_id,text,payload,entity_type,entity_id,scheduled_occurrence_id,scheduled_operation)
 VALUES(o.workspace_id,'scheduled:'||o.id||':'||CASE WHEN p_operation='send' THEN 'send' ELSE p_operation||':'||o.revision END,'scheduled_message','group','group:'||s.group_chat_id||':'||coalesce(s.thread_id::text,'main'),s.group_chat_id,s.thread_id,'Scheduled message','{}','scheduled_message',o.id,o.id,p_operation)
 ON CONFLICT(event_key,destination_key) DO NOTHING;
END $$;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_schedules_follow_up_minutes_check') THEN
  ALTER TABLE public.scheduled_message_schedules ADD CONSTRAINT scheduled_message_schedules_follow_up_minutes_check
   CHECK (follow_up_minutes IS NULL OR follow_up_minutes BETWEEN 1 AND 525600);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_schedules_type_check') THEN
  ALTER TABLE public.scheduled_message_schedules ADD CONSTRAINT scheduled_message_schedules_type_check CHECK(message_type IN ('announcement','attendance'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_occurrences_type_check') THEN
  ALTER TABLE public.scheduled_message_occurrences ADD CONSTRAINT scheduled_message_occurrences_type_check CHECK(message_type IN ('announcement','attendance'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_occurrences_role_check') THEN
  ALTER TABLE public.scheduled_message_occurrences ADD CONSTRAINT scheduled_message_occurrences_role_check
   CHECK ((post_role='primary' AND parent_occurrence_id IS NULL) OR (post_role='follow_up' AND parent_occurrence_id IS NOT NULL AND message_type='attendance'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_occurrences_parent_fkey') THEN
  ALTER TABLE public.scheduled_message_occurrences ADD CONSTRAINT scheduled_message_occurrences_parent_fkey
   FOREIGN KEY(parent_occurrence_id) REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_message_responses_decline_reason_check') THEN
  ALTER TABLE public.scheduled_message_responses ADD CONSTRAINT scheduled_message_responses_decline_reason_check
   CHECK (decline_reason IS NULL OR length(decline_reason)<=500);
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_message_primary_occurrence_key
 ON public.scheduled_message_occurrences(schedule_id,occurrence_on) WHERE post_role='primary';
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_message_follow_up_parent_key
 ON public.scheduled_message_occurrences(parent_occurrence_id) WHERE post_role='follow_up';
CREATE INDEX IF NOT EXISTS scheduled_occurrences_active ON public.scheduled_message_occurrences(workspace_id,send_on) WHERE state IN ('scheduled','sending');

ALTER TABLE public.scheduled_message_occurrences ENABLE TRIGGER record_item_activity;
ALTER TABLE public.scheduled_message_occurrences ENABLE TRIGGER record_item_deletion_activity;
ALTER TABLE public.scheduled_message_schedules ENABLE TRIGGER record_schedule_activity;
ALTER TABLE public.notification_deliveries ENABLE TRIGGER record_scheduled_delivery_activity;

CREATE OR REPLACE FUNCTION public.create_scheduled_schedule(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE
 v_id uuid; v_type text:=p_data->>'messageType'; v_body text:=p_data->>'body'; v_groups jsonb:=coalesce(p_data->'attendanceGroups','[]'::jsonb);
 v_attendees uuid[]; v_zone text:=public.workspace_timezone(p_workspace); v_thread bigint; v_send timestamptz; v_local timestamp; v_now boolean:=coalesce((p_data->>'sendNow')::boolean,false);
 v_frequency text; v_until date; v_follow integer;
BEGIN
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF NOT moc_private.scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) AS keys(key) WHERE key NOT IN
  ('messageType','body','attendeeIds','attendanceGroups','groupChatId','threadId','sendNow','startsOn','frequency','untilOn','followUpMinutes')) THEN
  RAISE EXCEPTION 'Unsupported scheduled-message input';
 END IF;
 IF p_data ?| ARRAY['templateId','fields','title','instructions','source','expiresAt','expiryHours','timezone','autoSend','requireArrival'] THEN RAISE EXCEPTION 'Removed scheduled-message fields are not accepted'; END IF;
 IF v_type NOT IN ('announcement','attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 PERFORM moc_private.scheduled_validate_body(v_type,v_body);
 PERFORM moc_private.scheduled_validate_groups(v_type,v_groups);
 v_follow:=nullif(p_data->>'followUpMinutes','')::integer;
 IF v_type='attendance' AND (v_follow IS NULL OR v_follow NOT BETWEEN 1 AND 525600) THEN RAISE EXCEPTION 'Attendance follow-up offset must be 1 to 525600 minutes'; END IF;
 IF v_type='announcement' AND v_follow IS NOT NULL THEN RAISE EXCEPTION 'Announcements do not have attendance follow-ups'; END IF;
 SELECT coalesce(array_agg(value::uuid ORDER BY ordinality),'{}') INTO v_attendees
 FROM jsonb_array_elements_text(coalesce(p_data->'attendeeIds','[]'::jsonb)) WITH ORDINALITY AS input(value,ordinality);
 IF cardinality(v_attendees)<>cardinality(ARRAY(SELECT DISTINCT unnest(v_attendees))) THEN RAISE EXCEPTION 'Attendees cannot be duplicated'; END IF;
 IF v_type='attendance' AND cardinality(v_attendees)=0 THEN RAISE EXCEPTION 'Select at least one attendee'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(v_attendees) attendee WHERE NOT EXISTS(SELECT 1 FROM public.workspace_users w WHERE w.workspace_id=p_workspace AND w.user_id=attendee)) THEN RAISE EXCEPTION 'Every attendee must be a current workspace member'; END IF;
 PERFORM moc_private.scheduled_validate_destination(p_workspace,p_data->>'groupChatId',nullif(p_data->>'threadId','')::bigint);
 IF p_data ? 'threadId' THEN v_thread:=nullif(p_data->>'threadId','')::bigint; END IF;
 IF v_now THEN
  IF p_data ?| ARRAY['startsOn','frequency','untilOn'] THEN RAISE EXCEPTION 'Send-now payload cannot include schedule fields'; END IF;
  v_send:=clock_timestamp(); v_local:=v_send AT TIME ZONE v_zone; v_frequency:='once'; v_until:=v_local::date;
 ELSE
  IF p_data ? 'sendNow' THEN RAISE EXCEPTION 'Scheduled payload must omit sendNow'; END IF;
  IF NOT (p_data ? 'startsOn') OR NOT (p_data ? 'frequency') THEN RAISE EXCEPTION 'Scheduled payload requires startsOn and frequency'; END IF;
  v_frequency:=p_data->>'frequency';
  IF v_frequency NOT IN ('once','daily','weekly','monthly') THEN RAISE EXCEPTION 'Invalid recurrence frequency'; END IF;
  IF p_data ? 'untilOn' THEN v_until:=(p_data->>'untilOn')::date; END IF;
  IF p_data->>'startsOn' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' THEN
   v_send:=(p_data->>'startsOn')::timestamptz;
  ELSE
   v_local:=(p_data->>'startsOn')::timestamp; v_send:=v_local AT TIME ZONE v_zone;
  END IF;
  v_local:=v_send AT TIME ZONE v_zone;
  IF v_send IS NULL OR v_send<=clock_timestamp()-interval '30 days' THEN RAISE EXCEPTION 'Start time must be within the recent scheduling window'; END IF;
  IF v_until IS NOT NULL AND v_until<v_local::date THEN RAISE EXCEPTION 'Last date must be on or after the first date'; END IF;
 END IF;
 INSERT INTO public.scheduled_message_schedules(workspace_id,attendee_ids,group_chat_id,thread_id,starts_on,send_time,until_on,timezone,frequency,enabled,body,message_type,attendance_groups,follow_up_minutes)
 VALUES(p_workspace,v_attendees,p_data->>'groupChatId',v_thread,v_local::date,v_local::time,v_until,v_zone,v_frequency,true,v_body,v_type,v_groups,v_follow)
 RETURNING id INTO v_id;
 PERFORM public.materialize_scheduled_messages(v_id);
 IF v_now THEN
  PERFORM public.request_scheduled_send(p_actor,(SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_id AND post_role='primary' ORDER BY occurrence_on LIMIT 1));
 END IF;
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE s public.scheduled_message_schedules; d date; today date; dt timestamptz; body_value text; group_value jsonb; follow_value integer; legacy jsonb; fields_value jsonb; expiry_hours numeric; c record; primary_id uuid;
BEGIN
 FOR s IN SELECT * FROM public.scheduled_message_schedules WHERE enabled AND (p_schedule IS NULL OR id=p_schedule) LOOP
  today:=(clock_timestamp() AT TIME ZONE s.timezone)::date;
  legacy:=CASE WHEN s.legacy_source_active THEN moc_private.scheduled_legacy_source(s.id) ELSE NULL END;
  FOR d IN SELECT value::date FROM generate_series(CASE WHEN s.frequency='once' THEN s.starts_on ELSE greatest(s.starts_on,today-30) END::timestamp,
    CASE WHEN s.frequency='once' THEN s.starts_on ELSE least(coalesce(s.until_on,today+32),today+32) END::timestamp,interval '1 day') value LOOP
   IF s.frequency='weekly' AND extract(isodow FROM d)<>extract(isodow FROM s.starts_on) THEN CONTINUE; END IF;
   IF s.frequency='weekdays' AND extract(isodow FROM d)>5 THEN CONTINUE; END IF;
   IF s.frequency='monthly' AND extract(day FROM d)<>extract(day FROM s.starts_on) THEN CONTINUE; END IF;
   dt:=(d+s.send_time) AT TIME ZONE s.timezone; body_value:=s.body; group_value:=s.attendance_groups; follow_value:=s.follow_up_minutes;
   IF legacy IS NOT NULL THEN
    fields_value:=coalesce(legacy->'fields','{}'::jsonb); expiry_hours:=coalesce((legacy->>'expiry_hours')::numeric,72);
    body_value:=legacy->>'body';
   END IF;
   FOR c IN SELECT DISTINCT ON(field) field,value FROM public.scheduled_message_series_changes WHERE schedule_id=s.id AND effective_on<=d ORDER BY field,effective_on DESC,id DESC LOOP
    IF c.field='attendanceGroups' THEN group_value:=c.value::jsonb;
    ELSIF c.field='followUpMinutes' THEN follow_value:=c.value::integer;
    ELSIF c.field='body' THEN body_value:=c.value;
    ELSIF c.field IN ('title','instructions') THEN fields_value:=jsonb_set(coalesce(fields_value,'{}'::jsonb),ARRAY[c.field],to_jsonb(c.value),true);
    ELSIF c.field='expiryHours' THEN expiry_hours:=c.value::numeric;
    END IF;
   END LOOP;
   IF legacy IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.scheduled_message_series_changes x WHERE x.schedule_id=s.id AND x.field='body' AND x.effective_on<=d)
     AND dt+make_interval(secs=>round(expiry_hours*3600)::double precision)<=clock_timestamp() THEN CONTINUE; END IF;
   IF legacy IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.scheduled_message_series_changes x WHERE x.schedule_id=s.id AND x.field='body' AND x.effective_on<=d) THEN
    body_value:=moc_private.render_legacy_scheduled_body(body_value,fields_value,dt+make_interval(secs=>round(expiry_hours*3600)::double precision),s.timezone);
   END IF;
   INSERT INTO public.scheduled_message_occurrences(workspace_id,schedule_id,attendee_ids,occurrence_on,send_on,body,message_type,state,attendance_groups)
   VALUES(s.workspace_id,s.id,s.attendee_ids,d,dt,body_value,s.message_type,'scheduled',group_value)
   ON CONFLICT(schedule_id,occurrence_on) WHERE post_role='primary' DO NOTHING;
   SELECT id INTO primary_id FROM public.scheduled_message_occurrences WHERE schedule_id=s.id AND occurrence_on=d AND post_role='primary';
   IF follow_value IS NOT NULL AND s.message_type='attendance' THEN
    INSERT INTO public.scheduled_message_occurrences AS existing(workspace_id,schedule_id,attendee_ids,occurrence_on,send_on,body,message_type,state,attendance_groups,post_role,parent_occurrence_id,roster_frozen)
    SELECT s.workspace_id,s.id,'{}'::uuid[],d,primary_row.send_on+make_interval(mins=>follow_value),primary_row.body,'attendance','scheduled',primary_row.attendance_groups,'follow_up',primary_row.id,true
    FROM public.scheduled_message_occurrences primary_row WHERE primary_row.id=primary_id
    ON CONFLICT(parent_occurrence_id) WHERE post_role='follow_up' DO UPDATE SET
     send_on=CASE WHEN existing.state='scheduled' THEN excluded.send_on ELSE existing.send_on END,
     body=CASE WHEN existing.state='scheduled' THEN excluded.body ELSE existing.body END,
     attendance_groups=CASE WHEN existing.state='scheduled' THEN excluded.attendance_groups ELSE existing.attendance_groups END;
   END IF;
  END LOOP;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_scheduled_messages() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE item record;
BEGIN
 PERFORM public.materialize_scheduled_messages();
 FOR item IN SELECT o.id FROM public.scheduled_message_occurrences o JOIN public.scheduled_message_schedules s ON s.id=o.schedule_id
  WHERE o.post_role='primary' AND o.state='scheduled' AND s.enabled AND o.send_on<=clock_timestamp() LOOP
  PERFORM moc_private.queue_scheduled_message(item.id,'send');
 END LOOP;
 FOR item IN SELECT child.id FROM public.scheduled_message_occurrences child
  JOIN public.scheduled_message_occurrences parent ON parent.id=child.parent_occurrence_id
  JOIN public.scheduled_message_schedules s ON s.id=child.schedule_id
  WHERE child.post_role='follow_up' AND child.state='scheduled' AND s.enabled AND child.send_on<=clock_timestamp()
    AND parent.state='sent' AND parent.telegram_message_id IS NOT NULL LOOP
  PERFORM moc_private.queue_scheduled_message(item.id,'send');
 END LOOP;
 DELETE FROM public.scheduled_message_sessions WHERE expires_at<=clock_timestamp();
END $$;

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
 UPDATE public.notification_deliveries SET payload=jsonb_build_object('manual',true),next_attempt_at=clock_timestamp(),status=CASE WHEN status='failed' THEN 'pending' ELSE status END
 WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send';
END $$;

CREATE OR REPLACE FUNCTION public.request_scheduled_resend(p_actor uuid,p_id uuid,p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences; queued uuid;
BEGIN
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF NOT moc_private.scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.legacy_closed OR o.state<>'sent' OR o.telegram_message_id IS NULL THEN RAISE EXCEPTION 'Message cannot be resent'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before resending'; END IF;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'Message delivery is in progress; retry after it finishes'; END IF;
 SELECT id INTO queued FROM public.notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='resend' AND status IN ('pending','processing') LIMIT 1;
 IF queued IS NOT NULL THEN UPDATE public.notification_deliveries SET next_attempt_at=clock_timestamp() WHERE id=queued; RETURN; END IF;
 UPDATE public.notification_deliveries SET status='failed',last_error='Superseded by resend' WHERE scheduled_occurrence_id=o.id AND scheduled_operation='edit' AND status IN ('pending','processing');
 UPDATE public.scheduled_message_occurrences SET revision=revision+1 WHERE id=o.id;
 PERFORM moc_private.queue_scheduled_message(o.id,'resend');
END $$;

CREATE OR REPLACE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE q public.notification_deliveries; o public.scheduled_message_occurrences; s public.scheduled_message_schedules; source_id uuid;
BEGIN
 SELECT * INTO STRICT q FROM public.notification_deliveries WHERE id=p_delivery;
 IF q.status<>'processing' OR q.scheduled_occurrence_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 SELECT * INTO STRICT s FROM public.scheduled_message_schedules WHERE id=o.schedule_id;
 IF o.delivery_lease IS NOT NULL AND o.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
 IF q.scheduled_operation='delete' THEN
  IF o.state<>'cancelled' OR o.telegram_message_id IS NULL THEN UPDATE public.notification_deliveries SET status='failed',last_error='No cancelled Telegram message to delete' WHERE id=q.id; RETURN NULL; END IF;
 ELSIF q.scheduled_operation='send' THEN
  IF o.state NOT IN ('scheduled','sending') OR o.legacy_closed THEN UPDATE public.notification_deliveries SET status='failed',last_error='Occurrence cannot be sent' WHERE id=q.id; RETURN NULL; END IF;
  IF NOT coalesce((q.payload->>'manual')::boolean,false) AND (NOT s.enabled OR o.send_on>clock_timestamp()) THEN
   UPDATE public.notification_deliveries SET status='pending',next_attempt_at=greatest(clock_timestamp()+interval '1 hour',o.send_on) WHERE id=q.id; RETURN NULL;
  END IF;
  IF o.post_role='follow_up' AND NOT EXISTS(SELECT 1 FROM public.scheduled_message_occurrences p WHERE p.id=o.parent_occurrence_id AND p.state='sent' AND p.telegram_message_id IS NOT NULL) THEN
   UPDATE public.notification_deliveries SET status='pending',next_attempt_at=clock_timestamp()+interval '1 minute' WHERE id=q.id; RETURN NULL;
  END IF;
 ELSIF q.scheduled_operation='resend' THEN
  IF o.state<>'sent' OR o.telegram_message_id IS NULL OR o.legacy_closed THEN UPDATE public.notification_deliveries SET status='failed',last_error='Occurrence cannot be resent' WHERE id=q.id; RETURN NULL; END IF;
 ELSIF q.scheduled_operation='expire' THEN
  UPDATE public.notification_deliveries SET status='failed',last_error='Scheduled-message expiry is no longer supported' WHERE id=q.id; RETURN NULL;
 ELSIF o.state<>'sent' OR o.telegram_message_id IS NULL OR o.legacy_closed THEN
  UPDATE public.notification_deliveries SET status='failed',last_error='Original message unavailable' WHERE id=q.id; RETURN NULL;
 END IF;
 PERFORM moc_private.scheduled_validate_destination(o.workspace_id,s.group_chat_id,s.thread_id);
 IF q.scheduled_operation='send' AND o.post_role='primary' AND o.message_type='attendance' AND NOT o.roster_frozen THEN
  INSERT INTO public.scheduled_message_responses(occurrence_id,user_id,name)
  SELECT o.id,u.id,trim(concat_ws(' ',u.name,u.surname)) FROM unnest(o.attendee_ids) WITH ORDINALITY chosen(user_id,ordinality)
   JOIN public.workspace_users w ON w.user_id=chosen.user_id AND w.workspace_id=o.workspace_id
   JOIN public.users u ON u.id=w.user_id ORDER BY chosen.ordinality ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.scheduled_message_occurrences SET delivery_lease=q.id,lease_until=clock_timestamp()+interval '2 minutes',roster_frozen=true,
  state=CASE WHEN q.scheduled_operation='send' THEN 'sending' ELSE state END WHERE id=o.id;
 source_id:=CASE WHEN o.post_role='follow_up' THEN o.parent_occurrence_id ELSE o.id END;
 RETURN jsonb_build_object('workspaceTimezone',public.workspace_timezone(o.workspace_id),'occurrence',to_jsonb(o),
  'responses',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY coalesce(array_position(parent_row.attendee_ids,r.user_id),2147483647),r.name,r.user_id),'[]'::jsonb)
   FROM public.scheduled_message_responses r JOIN public.scheduled_message_occurrences parent_row ON parent_row.id=source_id WHERE r.occurrence_id=source_id));
END $$;

CREATE OR REPLACE FUNCTION public.finish_scheduled_delivery(p_delivery uuid,p_revision integer,p_message bigint,p_error text DEFAULT NULL,p_ambiguous boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE q public.notification_deliveries; o public.scheduled_message_occurrences; child uuid;
BEGIN
 SELECT * INTO STRICT q FROM public.notification_deliveries WHERE id=p_delivery;
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=q.scheduled_occurrence_id FOR UPDATE;
 IF o.delivery_lease IS DISTINCT FROM q.id THEN RAISE EXCEPTION 'Delivery lease lost'; END IF;
 UPDATE public.scheduled_message_occurrences SET delivery_lease=NULL,lease_until=NULL,last_sync_error=p_error,
  state=CASE WHEN q.scheduled_operation IN ('send','resend') THEN
    CASE WHEN p_error IS NULL AND p_message IS NOT NULL THEN 'sent' WHEN p_ambiguous THEN 'unknown'
     WHEN q.scheduled_operation='resend' THEN 'sent' ELSE 'scheduled' END ELSE state END,
  telegram_message_id=CASE WHEN q.scheduled_operation IN ('send','resend') AND p_error IS NULL AND p_message IS NOT NULL THEN p_message ELSE telegram_message_id END,
  synced_revision=CASE WHEN p_error IS NULL THEN greatest(synced_revision,p_revision) ELSE synced_revision END WHERE id=o.id;
 IF p_error IS NULL AND o.revision>p_revision AND q.scheduled_operation<>'delete' THEN PERFORM moc_private.queue_scheduled_message(o.id,'edit'); END IF;
 IF q.scheduled_operation='send' AND o.post_role='primary' AND p_error IS NULL AND p_message IS NOT NULL THEN
  SELECT id INTO child FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=o.id AND post_role='follow_up';
  IF child IS NOT NULL AND EXISTS(SELECT 1 FROM public.scheduled_message_occurrences c WHERE c.id=child AND c.send_on<=clock_timestamp() AND c.state='scheduled') THEN
   PERFORM moc_private.queue_scheduled_message(child,'send');
  END IF;
 END IF;
END $$;

DROP FUNCTION IF EXISTS public.respond_scheduled_attendance(uuid,uuid,integer,text,text,text);
CREATE OR REPLACE FUNCTION public.respond_scheduled_attendance(p_actor uuid,p_id uuid,p_revision integer,p_status text,p_arrival text,p_group text,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences; child uuid;
BEGIN
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF o.post_role<>'primary' OR o.legacy_closed OR o.state<>'sent' OR o.message_type<>'attendance' THEN RAISE EXCEPTION 'Attendance is closed'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before responding'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workspace_users WHERE workspace_id=o.workspace_id AND user_id=p_actor)
   OR NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=o.id AND user_id=p_actor) THEN RAISE EXCEPTION 'You are not in this attendance roster'; END IF;
 IF p_status NOT IN ('attending','not_attending') THEN RAISE EXCEPTION 'Invalid attendance status'; END IF;
 IF jsonb_array_length(o.attendance_groups)=0 AND p_group IS NOT NULL THEN RAISE EXCEPTION 'This message has no attendance groups'; END IF;
 IF p_status='attending' THEN
  IF p_arrival IS NULL OR p_arrival !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'An arrival time is required'; END IF;
  IF jsonb_array_length(o.attendance_groups)>0 AND (p_group IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.attendance_groups) g WHERE g->>'id'=p_group)) THEN RAISE EXCEPTION 'Choose a valid attendance group'; END IF;
  p_reason:=NULL;
 ELSE
  IF p_reason IS NULL OR btrim(p_reason)='' OR length(p_reason)>500 THEN RAISE EXCEPTION 'A reason of up to 500 characters is required'; END IF;
  p_group:=NULL; p_arrival:=NULL;
 END IF;
 UPDATE public.scheduled_message_responses SET status=p_status,arrival_time=p_arrival,group_id=p_group,decline_reason=p_reason,acknowledged_revision=o.revision
 WHERE occurrence_id=o.id AND user_id=p_actor;
 UPDATE public.scheduled_message_occurrences SET revision=revision+1 WHERE id=o.id;
 PERFORM moc_private.queue_scheduled_message(o.id,'edit');
 SELECT id INTO child FROM public.scheduled_message_occurrences WHERE parent_occurrence_id=o.id AND post_role='follow_up' AND state='sent' AND NOT legacy_closed;
 IF child IS NOT NULL THEN UPDATE public.scheduled_message_occurrences SET revision=revision+1 WHERE id=child; PERFORM moc_private.queue_scheduled_message(child,'edit'); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_in_scheduled_attendance(p_actor uuid,p_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE child public.scheduled_message_occurrences; parent public.scheduled_message_occurrences; saved timestamptz; first_check_in boolean:=false;
BEGIN
 -- RSVP updates lock primary, then canonical response, then child. Follow the
 -- same order so concurrent RSVP/check-in never invert the row-lock order.
 SELECT * INTO STRICT child FROM public.scheduled_message_occurrences WHERE id=p_id;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF child.post_role<>'follow_up' OR child.legacy_closed OR child.state<>'sent' OR child.message_type<>'attendance' THEN RAISE EXCEPTION 'Attendance follow-up is unavailable'; END IF;
 SELECT * INTO STRICT parent FROM public.scheduled_message_occurrences WHERE id=child.parent_occurrence_id FOR UPDATE;
 IF parent.legacy_closed OR parent.message_type<>'attendance' OR child.telegram_message_id IS NULL THEN RAISE EXCEPTION 'Attendance follow-up is unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workspace_users WHERE workspace_id=parent.workspace_id AND user_id=p_actor) THEN RAISE EXCEPTION 'You are not a workspace member'; END IF;
 UPDATE public.scheduled_message_responses SET checked_in_at=clock_timestamp()
 WHERE occurrence_id=parent.id AND user_id=p_actor AND checked_in_at IS NULL RETURNING checked_in_at INTO saved;
 IF saved IS NOT NULL THEN first_check_in:=true;
 ELSE SELECT checked_in_at INTO saved FROM public.scheduled_message_responses WHERE occurrence_id=parent.id AND user_id=p_actor; END IF;
 IF saved IS NULL THEN RAISE EXCEPTION 'You are not in this attendance roster'; END IF;
 SELECT * INTO STRICT child FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF child.state<>'sent' OR child.legacy_closed THEN RAISE EXCEPTION 'Attendance follow-up is unavailable'; END IF;
 IF first_check_in THEN
  UPDATE public.scheduled_message_occurrences SET revision=revision+1 WHERE id=child.id;
  PERFORM moc_private.queue_scheduled_message(child.id,'edit');
 END IF;
 RETURN saved;
END $$;

CREATE OR REPLACE FUNCTION public.change_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_field text,p_value text,p_scope text DEFAULT 'occurrence') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences; root_row public.scheduled_message_occurrences; s public.scheduled_message_schedules; target record; groups jsonb; minutes_value integer; delta interval; primary_id uuid;
BEGIN
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF NOT moc_private.scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 primary_id:=CASE WHEN o.post_role='follow_up' THEN o.parent_occurrence_id ELSE o.id END;
 SELECT * INTO STRICT root_row FROM public.scheduled_message_occurrences WHERE id=primary_id FOR UPDATE;
 SELECT * INTO STRICT s FROM public.scheduled_message_schedules WHERE id=root_row.schedule_id FOR UPDATE;
 IF o.id=primary_id THEN o:=root_row;
 ELSE SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 END IF;
 IF o.legacy_closed OR o.state IN ('unknown','cancelled','sending') THEN RAISE EXCEPTION 'Message is no longer editable'; END IF;
 IF o.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before applying'; END IF;
 IF p_scope NOT IN ('occurrence','future','series') OR (s.frequency='once' AND p_scope<>'occurrence') THEN RAISE EXCEPTION 'Invalid edit scope'; END IF;
 IF p_field NOT IN ('body','attendanceGroups','sendOn','followUpMinutes') THEN RAISE EXCEPTION 'Unsupported scheduled-message edit'; END IF;
 IF p_field='sendOn' AND (o.post_role<>'primary' OR o.state<>'scheduled' OR p_scope<>'occurrence') THEN RAISE EXCEPTION 'Only an unsent primary can be moved'; END IF;
 IF p_field='followUpMinutes' AND (o.message_type<>'attendance' OR o.post_role<>'primary') THEN RAISE EXCEPTION 'Follow-up offset applies to attendance primaries only'; END IF;
 IF p_field='body' THEN PERFORM moc_private.scheduled_validate_body(o.message_type,p_value); END IF;
 IF p_field='attendanceGroups' THEN groups:=p_value::jsonb; PERFORM moc_private.scheduled_validate_groups(o.message_type,groups); END IF;
 IF p_field='followUpMinutes' THEN minutes_value:=p_value::integer; IF minutes_value NOT BETWEEN 1 AND 525600 THEN RAISE EXCEPTION 'Follow-up offset must be 1 to 525600 minutes'; END IF; END IF;
 IF p_field='sendOn' THEN delta:=p_value::timestamptz-o.send_on; END IF;
 IF p_scope='series' THEN
  IF p_field='body' THEN UPDATE public.scheduled_message_schedules SET body=p_value,legacy_source_active=false WHERE id=s.id;
  ELSIF p_field='attendanceGroups' THEN UPDATE public.scheduled_message_schedules SET attendance_groups=groups WHERE id=s.id;
  ELSIF p_field='followUpMinutes' THEN UPDATE public.scheduled_message_schedules SET follow_up_minutes=minutes_value WHERE id=s.id;
  END IF;
  DELETE FROM public.scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field;
 ELSIF p_scope='future' THEN
  DELETE FROM public.scheduled_message_series_changes WHERE schedule_id=s.id AND field=p_field AND effective_on>=o.occurrence_on;
  INSERT INTO public.scheduled_message_series_changes(schedule_id,effective_on,field,value) VALUES(s.id,o.occurrence_on,p_field,p_value);
 END IF;
 FOR target IN SELECT x.id,x.post_role,x.state,x.occurrence_on,x.parent_occurrence_id FROM public.scheduled_message_occurrences x
  WHERE x.schedule_id=s.id AND x.legacy_closed=false AND x.state IN ('scheduled','sent')
   AND (x.post_role='primary' OR x.id=o.id OR x.parent_occurrence_id=primary_id OR p_scope IN ('future','series'))
   AND (x.id=primary_id OR x.id=o.id OR x.parent_occurrence_id=primary_id OR p_scope='series' OR (p_scope='future' AND x.occurrence_on>=o.occurrence_on))
  ORDER BY x.occurrence_on,CASE WHEN x.post_role='primary' THEN 0 ELSE 1 END FOR UPDATE LOOP
  IF p_field='followUpMinutes' AND target.post_role='follow_up' AND target.state='sent' AND p_scope='occurrence' THEN RAISE EXCEPTION 'A sent follow-up cannot be moved'; END IF;
  IF target.post_role='follow_up' AND p_field IN ('sendOn','followUpMinutes') THEN CONTINUE; END IF;
  IF target.post_role='primary' AND o.post_role='follow_up' AND p_field IN ('sendOn','followUpMinutes') THEN CONTINUE; END IF;
  IF p_field='body' THEN UPDATE public.scheduled_message_occurrences SET body=p_value,revision=revision+1 WHERE id=target.id;
  ELSIF p_field='attendanceGroups' THEN
   IF EXISTS(SELECT 1 FROM public.scheduled_message_responses r WHERE r.occurrence_id=target.id AND r.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(groups) g WHERE g->>'id'=r.group_id)) THEN RAISE EXCEPTION 'Cannot remove a group already used by a response'; END IF;
   UPDATE public.scheduled_message_occurrences SET attendance_groups=groups,revision=revision+1 WHERE id=target.id;
  ELSIF p_field='sendOn' AND target.id=o.id THEN UPDATE public.scheduled_message_occurrences SET send_on=p_value::timestamptz,revision=revision+1 WHERE id=target.id;
  END IF;
  IF target.state='sent' THEN PERFORM moc_private.queue_scheduled_message(target.id,'edit'); END IF;
 END LOOP;
 IF p_field='sendOn' THEN
  UPDATE public.scheduled_message_occurrences SET send_on=send_on+delta,revision=revision+1
   WHERE parent_occurrence_id=o.id AND post_role='follow_up' AND state='scheduled';
 END IF;
 IF p_field='followUpMinutes' THEN
  IF p_scope='occurrence' THEN
   DELETE FROM public.scheduled_message_series_changes WHERE schedule_id=s.id AND effective_on=o.occurrence_on AND field=p_field;
   INSERT INTO public.scheduled_message_series_changes(schedule_id,effective_on,field,value) VALUES(s.id,o.occurrence_on,p_field,p_value);
  END IF;
  PERFORM public.materialize_scheduled_messages(s.id);
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_scheduled_occurrence(p_actor uuid,p_id uuid,p_revision integer,p_scope text DEFAULT 'occurrence') RETURNS uuid[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public','moc_private','pg_temp' AS $$
DECLARE o public.scheduled_message_occurrences; selected public.scheduled_message_occurrences; root_row public.scheduled_message_occurrences; s public.scheduled_message_schedules; affected uuid[]; target record; primary_id uuid;
BEGIN
 SELECT * INTO STRICT o FROM public.scheduled_message_occurrences WHERE id=p_id;
 IF NOT moc_private.scheduled_actor_context_matches(p_actor) THEN RAISE EXCEPTION 'Actor does not match authenticated context'; END IF;
 IF NOT moc_private.scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 selected:=o;
 IF o.post_role='follow_up' THEN primary_id:=o.parent_occurrence_id; ELSE primary_id:=o.id; END IF;
 SELECT * INTO STRICT root_row FROM public.scheduled_message_occurrences WHERE id=primary_id FOR UPDATE;
 SELECT * INTO STRICT s FROM public.scheduled_message_schedules WHERE id=root_row.schedule_id FOR UPDATE;
 IF selected.id=primary_id THEN o:=root_row;
 ELSE SELECT * INTO STRICT selected FROM public.scheduled_message_occurrences WHERE id=p_id FOR UPDATE; o:=root_row;
 END IF;
 IF selected.revision<>p_revision THEN RAISE EXCEPTION 'Message changed; reopen it before deleting'; END IF;
 IF p_scope NOT IN ('occurrence','future','series') OR (s.frequency='once' AND p_scope<>'occurrence') THEN RAISE EXCEPTION 'Invalid delete scope'; END IF;
 FOR target IN SELECT x.id FROM public.scheduled_message_occurrences x WHERE x.schedule_id=s.id AND x.state<>'cancelled'
  AND (x.id=primary_id OR x.parent_occurrence_id=primary_id OR p_scope='series' OR (p_scope='future' AND x.occurrence_on>=o.occurrence_on))
  ORDER BY x.occurrence_on,CASE WHEN x.post_role='primary' THEN 0 ELSE 1 END FOR UPDATE LOOP NULL; END LOOP;
 SELECT coalesce(array_agg(x.id ORDER BY x.occurrence_on,CASE WHEN x.post_role='primary' THEN 0 ELSE 1 END),'{}') INTO affected
 FROM public.scheduled_message_occurrences x WHERE x.schedule_id=s.id AND x.state<>'cancelled'
  AND (x.id=primary_id OR x.parent_occurrence_id=primary_id OR p_scope='series' OR (p_scope='future' AND x.occurrence_on>=o.occurrence_on));
 IF EXISTS(SELECT 1 FROM public.scheduled_message_occurrences x WHERE x.id=ANY(affected) AND (x.state='sending' OR (x.delivery_lease IS NOT NULL AND x.lease_until>clock_timestamp()))) THEN RAISE EXCEPTION 'Message delivery is in progress; retry after it finishes'; END IF;
 IF p_scope='series' OR (p_scope='future' AND o.occurrence_on<=s.starts_on) THEN UPDATE public.scheduled_message_schedules SET enabled=false WHERE id=s.id;
 ELSIF p_scope='future' THEN UPDATE public.scheduled_message_schedules SET until_on=least(coalesce(until_on,o.occurrence_on-1),o.occurrence_on-1) WHERE id=s.id; END IF;
 UPDATE public.notification_deliveries SET status='failed',last_error='Message deleted in Console'
  WHERE scheduled_occurrence_id=ANY(affected) AND status IN ('pending','processing') AND scheduled_operation<>'delete';
 UPDATE public.scheduled_message_occurrences SET state='cancelled',revision=revision+1,last_sync_error=NULL WHERE id=ANY(affected);
 FOR target IN SELECT x.id FROM public.scheduled_message_occurrences x WHERE x.id=ANY(affected) AND x.telegram_message_id IS NOT NULL LOOP PERFORM moc_private.queue_scheduled_message(target.id,'delete'); END LOOP;
 RETURN affected;
END $$;

-- The only remaining expiry references are private legacy-source reads and
-- private session cleanup; scheduled posts never receive or queue an expiry.
COMMENT ON TABLE moc_private.scheduled_message_v2_legacy_archive IS 'Restricted one-way archive for rendering legacy scheduled-message recurrence without retaining live templates or expiry controls.';
COMMENT ON COLUMN public.scheduled_message_occurrences.legacy_closed IS 'Preserves previously expired sent Telegram posts in their historical Closed state; blocks attendance callbacks.';
COMMENT ON COLUMN public.scheduled_message_schedules.legacy_source_active IS 'Reads archived pre-v2 recurrence source until its body is explicitly replaced.';

REVOKE ALL ON FUNCTION moc_private.scheduled_validate_body(text,text) FROM PUBLIC,moc_app,moc_public,moc_worker;
REVOKE ALL ON FUNCTION moc_private.render_legacy_scheduled_body(text,jsonb,timestamptz,text) FROM PUBLIC,moc_app,moc_public,moc_worker;
REVOKE ALL ON FUNCTION public.check_in_scheduled_attendance(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_scheduled_attendance(uuid,uuid) FROM moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.check_in_scheduled_attendance(uuid,uuid) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.respond_scheduled_attendance(uuid,uuid,integer,text,text,text,text) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.respond_scheduled_attendance(uuid,uuid,integer,text,text,text,text) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.create_scheduled_schedule(uuid,uuid,jsonb) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.create_scheduled_schedule(uuid,uuid,jsonb) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.request_scheduled_send(uuid,uuid) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.request_scheduled_send(uuid,uuid) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.request_scheduled_resend(uuid,uuid,integer) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.request_scheduled_resend(uuid,uuid,integer) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.change_scheduled_occurrence(uuid,uuid,integer,text,text,text) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.change_scheduled_occurrence(uuid,uuid,integer,text,text,text) TO moc_app,moc_worker;
REVOKE ALL ON FUNCTION public.delete_scheduled_occurrence(uuid,uuid,integer,text) FROM PUBLIC,moc_app,moc_worker;
GRANT EXECUTE ON FUNCTION public.delete_scheduled_occurrence(uuid,uuid,integer,text) TO moc_app,moc_worker;
