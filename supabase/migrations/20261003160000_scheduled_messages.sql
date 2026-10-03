BEGIN;

CREATE TABLE public.scheduled_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  message_type text NOT NULL CHECK (message_type IN ('announcement','pre_attendance')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 3000),
  fields jsonb NOT NULL CHECK (jsonb_typeof(fields) = 'object'),
  audience uuid[] NOT NULL DEFAULT '{}',
  require_arrival boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id)
);
CREATE TABLE public.scheduled_message_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  group_chat_id text NOT NULL REFERENCES public.telegram_groups(chat_id),
  thread_id bigint,
  starts_on date NOT NULL,
  until_on date CHECK (until_on IS NULL OR until_on >= starts_on),
  timezone text NOT NULL DEFAULT 'Africa/Johannesburg',
  frequency text NOT NULL CHECK (frequency IN ('once','daily','weekdays','weekly','monthly')),
  auto_send boolean NOT NULL DEFAULT true,
  expiry_hours integer NOT NULL DEFAULT 72 CHECK (expiry_hours BETWEEN 1 AND 8760),
  enabled boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL,
  audience uuid[] NOT NULL,
  require_arrival boolean NOT NULL,
  FOREIGN KEY (workspace_id,template_id) REFERENCES public.scheduled_message_templates(workspace_id,id),
  UNIQUE (workspace_id,id)
);
-- A per-field effective-date patch preserves individual exceptions and the
-- original occurrence identity when an administrator changes a future series.
CREATE TABLE public.scheduled_message_series_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.scheduled_message_schedules(id) ON DELETE CASCADE,
  effective_on date NOT NULL,
  field text NOT NULL,
  value text NOT NULL
);
CREATE TABLE public.scheduled_message_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL,
  occurrence_on date NOT NULL,
  send_on date NOT NULL,
  expires_at timestamptz NOT NULL,
  fields jsonb NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL,
  audience uuid[] NOT NULL,
  require_arrival boolean NOT NULL,
  state text NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled','sending','sent','unknown','cancelled')),
  revision integer NOT NULL DEFAULT 1,
  synced_revision integer NOT NULL DEFAULT 0,
  telegram_message_id bigint,
  roster_frozen boolean NOT NULL DEFAULT false,
  last_sync_error text,
  delivery_lease uuid,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id,occurrence_on),
  FOREIGN KEY (workspace_id,schedule_id) REFERENCES public.scheduled_message_schedules(workspace_id,id)
);
CREATE INDEX scheduled_occurrences_active ON public.scheduled_message_occurrences(workspace_id,expires_at,send_on);
CREATE TABLE public.scheduled_message_responses (
  occurrence_id uuid NOT NULL REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting' CHECK (status IN ('awaiting','attending','not_attending')),
  arrival_time text CHECK (arrival_time IS NULL OR arrival_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  acknowledged_revision integer NOT NULL DEFAULT 0,
  PRIMARY KEY (occurrence_id,user_id)
);
CREATE TABLE public.scheduled_message_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_user_id text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  thread_id bigint,
  ephemeral_message_id bigint,
  occurrence_id uuid REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('admin','attendance')),
  data jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  UNIQUE (telegram_user_id,chat_id)
);
ALTER TABLE public.notification_deliveries
  ADD COLUMN scheduled_occurrence_id uuid REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE,
  ADD COLUMN scheduled_operation text CHECK (scheduled_operation IN ('send','edit','expire'));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['scheduled_message_templates','scheduled_message_schedules','scheduled_message_occurrences','scheduled_message_responses','scheduled_message_series_changes','scheduled_message_sessions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.scheduled_message_series_changes_id_seq TO service_role;
GRANT SELECT ON public.scheduled_message_templates,public.scheduled_message_schedules,public.scheduled_message_occurrences TO authenticated;
CREATE POLICY scheduled_templates_read ON public.scheduled_message_templates FOR SELECT TO authenticated USING (private.current_user_can(workspace_id,'can_update'));
CREATE POLICY scheduled_schedules_read ON public.scheduled_message_schedules FOR SELECT TO authenticated USING (private.current_user_can(workspace_id,'can_update'));
CREATE POLICY scheduled_occurrences_read ON public.scheduled_message_occurrences FOR SELECT TO authenticated USING (private.current_user_can(workspace_id,'can_update'));

CREATE FUNCTION private.scheduled_actor_can(p_actor uuid,p_workspace uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM workspace_users w JOIN roles r ON r.id=w.role_id WHERE w.user_id=p_actor AND w.workspace_id=p_workspace AND r.can_update);
$$;
CREATE FUNCTION private.scheduled_validate_fields(p_type text,p_fields jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE k text; v jsonb; BEGIN
 IF jsonb_typeof(p_fields)<>'object' OR coalesce(length(trim(p_fields->>'title')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid message title'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF jsonb_typeof(v)<>'string' OR k NOT IN ('title','instructions','expectedArrival') OR (k='expectedArrival' AND p_type<>'pre_attendance') THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF k='instructions' AND length(p_fields->>k)>2000 THEN RAISE EXCEPTION 'Instructions too long'; END IF;
  IF k='expectedArrival' AND p_fields->>k<>'' AND NOT (p_fields->>k ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') THEN RAISE EXCEPTION 'Invalid arrival time'; END IF;
 END LOOP;
END $$;
CREATE FUNCTION private.scheduled_validate_destination(p_workspace uuid,p_chat text,p_thread bigint) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM telegram_groups WHERE chat_id=p_chat AND workspace_id=p_workspace AND active AND removed_at IS NULL) THEN RAISE EXCEPTION 'Telegram group unavailable'; END IF;
 IF p_thread IS NOT NULL AND NOT EXISTS(SELECT 1 FROM telegram_group_topics WHERE group_chat_id=p_chat AND thread_id=p_thread AND NOT closed) THEN RAISE EXCEPTION 'Telegram topic unavailable'; END IF;
END $$;

CREATE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE s scheduled_message_schedules; d date; f jsonb; h integer; c record; local_today date; BEGIN
 FOR s IN SELECT * FROM scheduled_message_schedules WHERE enabled AND (p_schedule IS NULL OR id=p_schedule) LOOP
  local_today := (clock_timestamp() AT TIME ZONE s.timezone)::date;
  FOR d IN SELECT day::date FROM generate_series(
    CASE WHEN s.frequency='once' THEN s.starts_on ELSE greatest(s.starts_on,local_today-30) END::timestamp,
    CASE WHEN s.frequency='once' THEN s.starts_on ELSE least(coalesce(s.until_on,local_today+32),local_today+32) END::timestamp,interval '1 day') day LOOP
   IF s.frequency='weekly' AND extract(isodow FROM d)<>extract(isodow FROM s.starts_on) THEN CONTINUE; END IF;
   IF s.frequency='weekdays' AND extract(isodow FROM d)>5 THEN CONTINUE; END IF;
   IF s.frequency='monthly' AND extract(day FROM d)<>extract(day FROM s.starts_on) THEN CONTINUE; END IF;
   f:=s.fields; h:=s.expiry_hours;
   FOR c IN SELECT DISTINCT ON(field) field,value FROM scheduled_message_series_changes WHERE schedule_id=s.id AND effective_on<=d ORDER BY field,effective_on DESC,id DESC LOOP
    IF c.field='expiryHours' THEN h:=c.value::integer; ELSE f:=jsonb_set(f,ARRAY[c.field],to_jsonb(c.value),true); END IF;
   END LOOP;
   IF ((d::timestamp AT TIME ZONE s.timezone) + make_interval(hours=>h))<=clock_timestamp() THEN CONTINUE; END IF;
   INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival)
    VALUES(s.workspace_id,s.id,d,d,(d::timestamp AT TIME ZONE s.timezone)+make_interval(hours=>h),f,s.body,s.message_type,s.audience,s.require_arrival) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;

-- Queue identity is the occurrence for sends, and the revision for edits. All
-- paths use the existing notification delivery queue and its provider adapter.
CREATE FUNCTION private.queue_scheduled_message(p_id uuid,p_operation text) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id;
 INSERT INTO notification_deliveries(workspace_id,event_key,event_type,scope,destination_key,chat_id,thread_id,text,payload,entity_type,entity_id,scheduled_occurrence_id,scheduled_operation)
 VALUES(o.workspace_id,'scheduled:'||o.id||':'||CASE WHEN p_operation='send' THEN 'send' ELSE p_operation||':'||o.revision END,'scheduled_message','group','group:'||s.group_chat_id||':'||coalesce(s.thread_id::text,'main'),s.group_chat_id,s.thread_id,'Scheduled message','{}','scheduled_message',o.id,o.id,p_operation)
 ON CONFLICT(event_key,destination_key) DO NOTHING;
END $$;

CREATE FUNCTION public.prepare_scheduled_messages() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE item record; BEGIN
 PERFORM materialize_scheduled_messages();
 FOR item IN SELECT o.id FROM scheduled_message_occurrences o JOIN scheduled_message_schedules s ON s.id=o.schedule_id WHERE o.state='scheduled' AND s.enabled AND s.auto_send AND o.send_on <= (clock_timestamp() AT TIME ZONE s.timezone)::date AND o.expires_at>clock_timestamp() LOOP
  PERFORM queue_scheduled_message(item.id,'send');
 END LOOP;
 FOR item IN SELECT id FROM scheduled_message_occurrences WHERE state='sent' AND expires_at<=clock_timestamp() LOOP
  PERFORM queue_scheduled_message(item.id,'expire');
 END LOOP;
 DELETE FROM scheduled_message_sessions WHERE expires_at<=clock_timestamp();
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname IN ('scheduled_actor_can','scheduled_validate_fields','scheduled_validate_destination','queue_scheduled_message') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.materialize_scheduled_messages(uuid),public.prepare_scheduled_messages() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_scheduled_messages(uuid),public.prepare_scheduled_messages() TO service_role;
COMMIT;
