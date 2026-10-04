-- Standalone final-state MoC PostgreSQL domain schema.
-- This is a schema-only snapshot of the approved domain database. The bootstrap
-- installs auth, upload storage, and broadcast revision objects in their own phases.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.15 (Homebrew)
-- Dumped by pg_dump version 16.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: moc_private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS moc_private;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'booked',
    'checked_out',
    'returned',
    'archived'
);


--
-- Name: broadcast_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.broadcast_kind AS ENUM (
    'audio',
    'video'
);


--
-- Name: equipment_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.equipment_category AS ENUM (
    'camera',
    'lens',
    'lighting',
    'audio',
    'support',
    'monitor',
    'cable',
    'accessory'
);


--
-- Name: equipment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.equipment_status AS ENUM (
    'available',
    'booked',
    'booked_out',
    'maintenance'
);


--
-- Name: request_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_category AS ENUM (
    'video_production',
    'video_shooting',
    'graphic_design',
    'event',
    'education'
);


--
-- Name: request_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'archived'
);


--
-- Name: stream_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stream_status AS ENUM (
    'created',
    'ready',
    'live',
    'complete'
);


--
-- Name: venue_booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.venue_booking_status AS ENUM (
    'auto',
    'cancelled',
    'approved',
    'rejected'
);


--
-- Name: youtube_connection_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.youtube_connection_status AS ENUM (
    'active',
    'reauth_required'
);


--
-- Name: zoom_meeting_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.zoom_meeting_type AS ENUM (
    'instant',
    'scheduled',
    'recurring_no_fixed',
    'recurring_fixed'
);


--
-- Name: zoom_recurrence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.zoom_recurrence_type AS ENUM (
    'none',
    'daily',
    'weekly',
    'monthly'
);


--
-- Name: assign_default_member_type(); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.assign_default_member_type() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF NEW.member_type_id IS NULL THEN SELECT id INTO NEW.member_type_id FROM public.workspace_member_types WHERE workspace_id=NEW.workspace_id AND is_default; END IF;
 RETURN NEW;
END $$;


--
-- Name: create_default_member_type(); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.create_default_member_type() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN INSERT INTO public.workspace_member_types(workspace_id,name,is_default) VALUES(NEW.id,'Members',true); RETURN NEW; END $$;


--
-- Name: current_user_can(uuid, text); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.current_user_can(p_workspace_id uuid, p_permission text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users AS membership
    JOIN public.roles AS role ON role.id = membership.role_id
    WHERE membership.workspace_id = p_workspace_id
      AND membership.user_id = moc_private.actor_id()
      AND CASE p_permission
        WHEN 'can_create'       THEN role.can_create
        WHEN 'can_read'         THEN role.can_read
        WHEN 'can_update'       THEN role.can_update
        WHEN 'can_delete'       THEN role.can_delete
        WHEN 'can_manage_roles' THEN role.can_manage_roles
        ELSE false
      END
  );
$$;


--
-- Name: expand_venue_booking_slots(uuid, timestamp with time zone[], jsonb); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.expand_venue_booking_slots(p_workspace_id uuid, p_slot_starts timestamp with time zone[], p_recurrence jsonb) RETURNS TABLE(occurrence_index integer, slot_start timestamp with time zone, slot_end timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
DECLARE
  v_zone text := public.workspace_timezone(p_workspace_id);
  v_start_date date;
BEGIN
  IF coalesce(array_length(p_slot_starts, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choose at least one time slot.' USING ERRCODE = 'check_violation';
  END IF;
  v_start_date := (p_slot_starts[1] AT TIME ZONE v_zone)::date;

  RETURN QUERY
  SELECT
    recurrence_date.occurrence_index,
    ((recurrence_date.occurrence_date + (initial_slot.slot AT TIME ZONE v_zone)::time) AT TIME ZONE v_zone) AS slot_start,
    ((recurrence_date.occurrence_date + (initial_slot.slot AT TIME ZONE v_zone)::time) AT TIME ZONE v_zone) + interval '30 minutes' AS slot_end
  FROM moc_private.venue_recurrence_dates(v_start_date, p_recurrence) AS recurrence_date
  CROSS JOIN unnest(p_slot_starts) AS initial_slot(slot);
END;
$$;


--
-- Name: is_workspace_member(uuid); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.is_workspace_member(p_workspace_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_users
    WHERE workspace_id = p_workspace_id
      AND user_id = moc_private.actor_id()
  );
$$;


--
-- Name: protect_default_member_type(); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.protect_default_member_type() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.is_default AND EXISTS(SELECT 1 FROM public.workspaces WHERE id=OLD.workspace_id) THEN RAISE EXCEPTION 'The default member type cannot be deleted'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.workspace_id<>OLD.workspace_id OR NEW.is_default<>OLD.is_default THEN RAISE EXCEPTION 'Member type identity cannot change'; END IF;
 RETURN NEW;
END $$;


--
-- Name: queue_scheduled_message(uuid, text); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.queue_scheduled_message(p_id uuid, p_operation text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE o scheduled_message_occurrences; s scheduled_message_schedules; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id;
 SELECT * INTO STRICT s FROM scheduled_message_schedules WHERE id=o.schedule_id;
 INSERT INTO notification_deliveries(workspace_id,event_key,event_type,scope,destination_key,chat_id,thread_id,text,payload,entity_type,entity_id,scheduled_occurrence_id,scheduled_operation)
 VALUES(o.workspace_id,'scheduled:'||o.id||':'||CASE WHEN p_operation='send' THEN 'send' ELSE p_operation||':'||o.revision END,'scheduled_message','group','group:'||s.group_chat_id||':'||coalesce(s.thread_id::text,'main'),s.group_chat_id,s.thread_id,'Scheduled message','{}','scheduled_message',o.id,o.id,p_operation)
 ON CONFLICT(event_key,destination_key) DO NOTHING;
END $$;


--
-- Name: scheduled_actor_can(uuid, uuid); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.scheduled_actor_can(p_actor uuid, p_workspace uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
 SELECT EXISTS(SELECT 1 FROM workspace_users w JOIN roles r ON r.id=w.role_id WHERE w.user_id=p_actor AND w.workspace_id=p_workspace AND r.can_update);
$$;


--
-- Name: scheduled_validate_destination(uuid, text, bigint); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.scheduled_validate_destination(p_workspace uuid, p_chat text, p_thread bigint) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM telegram_groups WHERE chat_id=p_chat AND workspace_id=p_workspace AND active AND removed_at IS NULL) THEN RAISE EXCEPTION 'Telegram group unavailable'; END IF;
 IF p_thread IS NOT NULL AND NOT EXISTS(SELECT 1 FROM telegram_group_topics WHERE group_chat_id=p_chat AND thread_id=p_thread AND NOT closed) THEN RAISE EXCEPTION 'Telegram topic unavailable'; END IF;
END $$;


--
-- Name: scheduled_validate_fields(text, jsonb); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.scheduled_validate_fields(p_type text, p_fields jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE k text; v jsonb; BEGIN
 IF p_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR coalesce(length(trim(p_fields->>'title')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid message title'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF jsonb_typeof(v)<>'string' OR k NOT IN ('title','instructions') THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF k='instructions' AND length(p_fields->>k)>2000 THEN RAISE EXCEPTION 'Instructions too long'; END IF;
 END LOOP;
END $$;


--
-- Name: scheduled_validate_groups(text, jsonb); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.scheduled_validate_groups(p_type text, p_groups jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $_$
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
END $_$;


--
-- Name: seed_default_request_categories(); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.seed_default_request_categories() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.request_categories (workspace_id, key, name, sort_order)
  VALUES
    (NEW.id, 'video_production', 'Video Production', 10),
    (NEW.id, 'video_shooting', 'Video Shooting', 20),
    (NEW.id, 'graphic_design', 'Graphic Design', 30),
    (NEW.id, 'event', 'Event', 40),
    (NEW.id, 'education', 'Education', 50)
  ON CONFLICT (workspace_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: venue_recurrence_dates(date, jsonb); Type: FUNCTION; Schema: moc_private; Owner: -
--

CREATE FUNCTION moc_private.venue_recurrence_dates(p_start_date date, p_recurrence jsonb) RETURNS TABLE(occurrence_index integer, occurrence_date date)
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $_$
DECLARE
  v_frequency text;
  v_interval integer;
  v_weekdays integer[];
  v_end_type text;
  v_end_date date;
  v_target_count integer;
  v_emitted integer := 0;
  v_step integer := 0;
  v_candidate date;
  v_week_start date;
  v_weekday integer;
BEGIN
  IF p_recurrence IS NULL THEN
    RETURN QUERY SELECT 0, p_start_date;
    RETURN;
  END IF;

  IF jsonb_typeof(p_recurrence) <> 'object'
    OR NOT (p_recurrence ?& ARRAY['frequency', 'interval', 'weekdays', 'end'])
    OR jsonb_typeof(p_recurrence->'weekdays') <> 'array'
    OR jsonb_typeof(p_recurrence->'end') <> 'object'
  THEN
    RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
  END IF;

  v_frequency := p_recurrence->>'frequency';
  IF v_frequency NOT IN ('day', 'week', 'month')
    OR coalesce(p_recurrence->>'interval', '') !~ '^[0-9]+$'
  THEN
    RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
  END IF;
  v_interval := (p_recurrence->>'interval')::integer;
  IF v_interval < 1 OR v_interval > 365 THEN
    RAISE EXCEPTION 'The repeat interval must be between 1 and 365.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(array_agg(DISTINCT value::integer ORDER BY value::integer), ARRAY[]::integer[])
  INTO v_weekdays
  FROM jsonb_array_elements_text(p_recurrence->'weekdays') AS weekday(value)
  WHERE value ~ '^[1-7]$';
  IF jsonb_array_length(p_recurrence->'weekdays') > 7
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(p_recurrence->'weekdays') AS weekday(value)
      WHERE value !~ '^[1-7]$'
    )
    OR coalesce(array_length(v_weekdays, 1), 0) <> jsonb_array_length(p_recurrence->'weekdays')
  THEN
    RAISE EXCEPTION 'Choose valid weekdays without duplicates.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_frequency = 'week' AND coalesce(array_length(v_weekdays, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choose at least one weekday.' USING ERRCODE = 'check_violation';
  END IF;

  v_end_type := p_recurrence->'end'->>'type';
  IF v_end_type = 'year_end' THEN
    v_end_date := make_date(extract(year FROM p_start_date)::integer, 12, 31);
  ELSIF v_end_type = 'date' THEN
    IF coalesce(p_recurrence->'end'->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'Choose a valid recurrence end date.' USING ERRCODE = 'check_violation';
    END IF;
    v_end_date := (p_recurrence->'end'->>'date')::date;
    IF v_end_date < p_start_date THEN
      RAISE EXCEPTION 'The recurrence cannot end before the first booking.' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_end_type = 'count' THEN
    IF coalesce(p_recurrence->'end'->>'count', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Choose a valid occurrence count.' USING ERRCODE = 'check_violation';
    END IF;
    v_target_count := (p_recurrence->'end'->>'count')::integer;
    IF v_target_count < 2 OR v_target_count > 366 THEN
      RAISE EXCEPTION 'Occurrence count must be between 2 and 366.' USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    RAISE EXCEPTION 'Choose when the recurrence ends.' USING ERRCODE = 'check_violation';
  END IF;

  occurrence_index := v_emitted;
  occurrence_date := p_start_date;
  RETURN NEXT;
  v_emitted := 1;

  IF v_target_count = 1 OR (v_end_date IS NOT NULL AND p_start_date >= v_end_date) THEN RETURN; END IF;

  IF v_frequency = 'week' THEN
    v_week_start := p_start_date - (extract(isodow FROM p_start_date)::integer - 1);
    v_step := -1;
    LOOP
      v_step := v_step + 1;
      FOREACH v_weekday IN ARRAY v_weekdays LOOP
        v_candidate := v_week_start + (v_step * v_interval * 7) + (v_weekday - 1);
        IF v_candidate <= p_start_date THEN CONTINUE; END IF;
        IF v_end_date IS NOT NULL AND v_candidate > v_end_date THEN RETURN; END IF;
        IF v_target_count IS NULL AND v_emitted >= 366 THEN
          RAISE EXCEPTION 'Repeat patterns can contain at most 366 occurrences.' USING ERRCODE = 'check_violation';
        END IF;
        occurrence_index := v_emitted;
        occurrence_date := v_candidate;
        RETURN NEXT;
        v_emitted := v_emitted + 1;
        IF v_target_count IS NOT NULL AND v_emitted >= v_target_count THEN RETURN; END IF;
      END LOOP;
    END LOOP;
  END IF;

  LOOP
    v_step := v_step + 1;
    IF v_frequency = 'day' THEN
      v_candidate := p_start_date + (v_step * v_interval);
    ELSIF v_frequency = 'month' THEN
      v_candidate := (p_start_date + make_interval(months => v_step * v_interval))::date;
    ELSE
      RAISE EXCEPTION 'Choose a valid repeat pattern.' USING ERRCODE = 'check_violation';
    END IF;
    IF v_end_date IS NOT NULL AND v_candidate > v_end_date THEN RETURN; END IF;
    IF v_target_count IS NULL AND v_emitted >= 366 THEN
      RAISE EXCEPTION 'Repeat patterns can contain at most 366 occurrences.' USING ERRCODE = 'check_violation';
    END IF;
    occurrence_index := v_emitted;
    occurrence_date := v_candidate;
    RETURN NEXT;
    v_emitted := v_emitted + 1;
    IF v_target_count IS NOT NULL AND v_emitted >= v_target_count THEN RETURN; END IF;
  END LOOP;
END;
$_$;


--
-- Name: api_apply_telegram_action(text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_apply_telegram_action(p_telegram_user_id text, p_entity_type text, p_entity_id uuid, p_action text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_user_id      uuid;
  v_user_name    text;
  v_workspace_id uuid;
  v_status       text;
  v_next         text;
BEGIN
  SELECT id, coalesce(nullif(btrim(concat_ws(' ', name, surname)), ''), email)
    INTO v_user_id, v_user_name
  FROM public.users
  WHERE telegram_chat_id = btrim(p_telegram_user_id);

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_linked');
  END IF;

  IF p_entity_type = 'request' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'booking' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.bookings WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'venue_booking' THEN
    SELECT workspace_id, status::text INTO v_workspace_id, v_status
    FROM public.venue_bookings WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_action');
  END IF;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_users AS membership
    JOIN public.roles AS role ON role.id = membership.role_id
    WHERE membership.workspace_id = v_workspace_id
      AND membership.user_id = v_user_id
      AND role.can_update
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_next := CASE
    WHEN p_entity_type = 'request' AND p_action = 'start'
      AND v_status = 'not_started' THEN 'in_progress'
    WHEN p_entity_type = 'request' AND p_action = 'complete'
      AND v_status IN ('not_started', 'in_progress') THEN 'completed'
    WHEN p_entity_type = 'booking' AND p_action = 'check_out'
      AND v_status = 'booked' THEN 'checked_out'
    WHEN p_entity_type = 'booking' AND p_action = 'return'
      AND v_status = 'checked_out' THEN 'returned'
    WHEN p_entity_type = 'venue_booking' AND p_action = 'approve'
      AND v_status = 'auto' THEN 'approved'
    WHEN p_entity_type = 'venue_booking' AND p_action = 'reject'
      AND v_status IN ('auto', 'approved') THEN 'rejected'
  END;

  IF v_next IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_transition', 'status', v_status,
      'workspaceId', v_workspace_id);
  END IF;

  PERFORM set_config('moc.user_id', v_user_id::text, true);
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);

  IF p_entity_type = 'request' THEN
    UPDATE public.requests SET status = v_next::public.request_status WHERE id = p_entity_id;
  ELSIF p_entity_type = 'booking' AND v_next = 'checked_out' THEN
    UPDATE public.bookings SET status = 'checked_out', checked_out_at = now() WHERE id = p_entity_id;
  ELSIF p_entity_type = 'booking' THEN
    UPDATE public.bookings SET status = 'returned', returned_at = now() WHERE id = p_entity_id;
  ELSIF v_next = 'approved' THEN
    UPDATE public.venue_bookings
    SET status = 'approved', approved_at = now(), approved_by = v_user_id,
        rejected_at = NULL, rejected_by = NULL
    WHERE id = p_entity_id;
  ELSE
    UPDATE public.venue_bookings
    SET status = 'rejected', rejected_at = now(), rejected_by = v_user_id,
        approved_at = NULL, approved_by = NULL
    WHERE id = p_entity_id;
  END IF;

  PERFORM set_config('moc.suppress_item_notifications', '', true);

  RETURN jsonb_build_object('workspaceId', v_workspace_id, 'previousStatus', v_status,
    'status', v_next, 'actorId', v_user_id, 'actorName', v_user_name);
END;
$$;


--
-- Name: api_delete_tracking_submission(text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_delete_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_request public.requests%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_venue public.venue_bookings%ROWTYPE;
  v_venue_name text;
  v_entity_id uuid;
BEGIN
  IF p_type = 'request' THEN
    SELECT * INTO v_request FROM public.requests WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_request.status IN ('completed', 'archived') THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_request.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_request.workspace_id, 'request.requester_deleted', 'request', v_request.id,
      format('request.requester_deleted:%s:%s', v_request.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_request.title, 'status', v_request.status::text,
        'requesterName', v_request.requested_by, 'trackingCode', v_code,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_request.id;
    DELETE FROM public.requests WHERE id = v_request.id;

  ELSIF p_type = 'booking' THEN
    SELECT * INTO v_booking FROM public.bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_booking.status::text <> 'booked' OR v_booking.checked_out_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_booking.workspace_id, 'booking.requester_deleted', 'booking', v_booking.id,
      format('booking.requester_deleted:%s:%s', v_booking.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_booking.title, 'status', v_booking.status::text,
        'requesterName', v_booking.booked_by, 'trackingCode', v_code,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_booking.id;
    DELETE FROM public.bookings WHERE id = v_booking.id;

  ELSIF p_type = 'venue_booking' THEN
    SELECT * INTO v_venue FROM public.venue_bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_venue.status = 'cancelled' OR v_venue.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_venue.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    SELECT name INTO v_venue_name FROM public.venues WHERE id = v_venue.venue_id;
    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_venue.workspace_id, 'venue_booking.requester_deleted', 'venue_booking', v_venue.id,
      format('venue_booking.requester_deleted:%s:%s', v_venue.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_venue.title, 'requesterName', v_venue.requested_by, 'trackingCode', v_code,
        'venueName', v_venue_name, 'startsAt', v_venue.starts_at, 'endsAt', v_venue.ends_at,
        'changeSummary', 'Deleted by requester'
      )
    );
    v_entity_id := v_venue.id;
    DELETE FROM public.venue_bookings WHERE id = v_venue.id;
  ELSE
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN jsonb_build_object('entityId', v_entity_id);
END;
$$;


--
-- Name: api_lookup_tracking_submission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_lookup_tracking_submission(p_tracking_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'type', 'request', 'id', request.id, 'trackingCode', request.tracking_code,
    'title', request.title, 'status', request.status::text, 'priority', request.priority::text,
    'category', request.category, 'categoryName', category.name,
    'requestedBy', request.requested_by, 'dueDate', request.due_date,
    'who', request.who, 'what', request.what, 'whenText', request.when_text,
    'whereText', request.where_text, 'why', request.why, 'how', request.how,
    'notes', request.notes, 'flow', request.flow,
    'createdAt', request.created_at, 'updatedAt', request.updated_at
  ) INTO v_result
  FROM public.requests AS request
  JOIN public.request_categories AS category
    ON category.workspace_id = request.workspace_id AND category.key = request.category
  WHERE request.tracking_code = v_code;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT jsonb_build_object(
    'type', 'booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title, 'status', booking.status::text, 'bookedBy', booking.booked_by,
    'checkedOutAt', booking.checked_out_at, 'expectedReturnAt', booking.expected_return_at,
    'returnedAt', booking.returned_at, 'notes', booking.notes,
    'requestedEquipment', to_jsonb(booking.requested_equipment),
    'otherEquipment', coalesce(booking.other_equipment, ''),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', item.id, 'equipmentId', equipment.id, 'equipmentName', equipment.name,
        'equipmentCategory', equipment.category::text
      ) ORDER BY equipment.name), '[]'::jsonb)
      FROM public.booking_items AS item
      JOIN public.equipment AS equipment ON equipment.id = item.equipment_id
      WHERE item.booking_id = booking.id
    )
  ) INTO v_result
  FROM public.bookings AS booking
  WHERE booking.tracking_code = v_code;
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;

  SELECT jsonb_build_object(
    'type', 'venue_booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title,
    'status', public.venue_booking_phase(booking.status, booking.starts_at, booking.ends_at),
    'requestedBy', booking.requested_by, 'venueId', booking.venue_id,
    'venueName', venue.name, 'venueDescription', venue.description,
    'eventId', booking.event_id, 'eventName', event.name, 'eventOther', booking.event_other,
    'timeZone', public.workspace_timezone(booking.workspace_id),
    'startsAt', booking.starts_at, 'endsAt', booking.ends_at, 'notes', booking.notes,
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (
      SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot
      WHERE slot.venue_booking_id = booking.id
    )
  ) INTO v_result
  FROM public.venue_bookings AS booking
  JOIN public.venues AS venue ON venue.id = booking.venue_id
  LEFT JOIN public.venue_events AS event ON event.id = booking.event_id
  WHERE booking.tracking_code = v_code;

  RETURN v_result;
END;
$$;


--
-- Name: api_lookup_tracking_venue_booking(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  WITH matched AS (
    SELECT booking.*, venue.name AS venue_name, venue.description AS venue_description,
      event.name AS event_name, public.workspace_timezone(booking.workspace_id) AS time_zone
    FROM public.venue_bookings AS booking
    JOIN public.venues AS venue ON venue.id = booking.venue_id
    LEFT JOIN public.venue_events AS event ON event.id = booking.event_id
    WHERE booking.tracking_code = upper(btrim(p_tracking_code))
  ), occurrences AS (
    SELECT slot.venue_booking_id, slot.occurrence_index,
      min(slot.slot_start) AS starts_at, max(slot.slot_end) AS ends_at
    FROM public.venue_booking_slots AS slot
    JOIN matched ON matched.id = slot.venue_booking_id
    GROUP BY slot.venue_booking_id, slot.occurrence_index
  ), occurrence_json AS (
    SELECT venue_booking_id,
      jsonb_agg(jsonb_build_object('index', occurrence_index, 'startsAt', starts_at, 'endsAt', ends_at) ORDER BY occurrence_index) AS items,
      max(ends_at) AS last_ends_at,
      bool_or(now() >= starts_at AND now() < ends_at) AS in_progress
    FROM occurrences GROUP BY venue_booking_id
  )
  SELECT jsonb_build_object(
    'type', 'venue_booking', 'id', booking.id, 'trackingCode', booking.tracking_code,
    'title', booking.title,
    'status', CASE WHEN booking.status IN ('cancelled', 'rejected') THEN booking.status::text
      WHEN coalesce(occurrence_json.in_progress, false) THEN 'in_progress'
      WHEN now() >= coalesce(occurrence_json.last_ends_at, booking.ends_at) THEN 'completed'
      WHEN now() >= booking.starts_at THEN 'in_progress'
      WHEN booking.status = 'approved' THEN 'approved' ELSE 'booked' END,
    'requestedBy', booking.requested_by, 'venueId', booking.venue_id,
    'venueName', booking.venue_name, 'venueDescription', booking.venue_description,
    'eventId', booking.event_id, 'eventName', booking.event_name, 'eventOther', booking.event_other,
    'timeZone', booking.time_zone, 'startsAt', booking.starts_at, 'endsAt', booking.ends_at,
    'notes', booking.notes,
    'recurrence', booking.recurrence, 'occurrences', coalesce(occurrence_json.items, '[]'::jsonb),
    'createdAt', booking.created_at, 'updatedAt', booking.updated_at,
    'slotStarts', (SELECT coalesce(jsonb_agg(slot.slot_start ORDER BY slot.slot_start), '[]'::jsonb)
      FROM public.venue_booking_slots AS slot WHERE slot.venue_booking_id = booking.id AND slot.occurrence_index = 0)
  )
  FROM matched AS booking
  LEFT JOIN occurrence_json ON occurrence_json.venue_booking_id = booking.id;
$$;


--
-- Name: api_update_tracking_submission(text, text, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_update_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone, p_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_code text := upper(btrim(p_tracking_code));
  v_request public.requests%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_venue public.venue_bookings%ROWTYPE;
  v_entity_id uuid;
  v_workspace_id uuid;
  v_change_summary text;
  v_requested text[];
  v_other text;
  v_venue_id uuid;
  v_event_id uuid;
  v_event_other text;
  v_title text;
  v_venue_name text;
  v_slots timestamptz[];
  v_count integer;
  v_zone text;
  v_local_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
BEGIN
  IF jsonb_typeof(p_data) <> 'object' THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  IF p_type = 'request' THEN
    SELECT * INTO v_request FROM public.requests WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_request.status IN ('completed', 'archived') THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_request.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.request_categories
      WHERE workspace_id = v_request.workspace_id
        AND key = p_data->>'category'
        AND (active OR key = v_request.category)
    ) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    IF nullif(btrim(p_data->>'title'), '') IS NULL OR char_length(btrim(p_data->>'title')) > 120
      OR nullif(btrim(p_data->>'requestedBy'), '') IS NULL OR char_length(btrim(p_data->>'requestedBy')) > 200
      OR nullif(btrim(p_data->>'who'), '') IS NULL OR char_length(p_data->>'who') > 4000
      OR nullif(btrim(p_data->>'what'), '') IS NULL OR char_length(p_data->>'what') > 4000
      OR nullif(btrim(p_data->>'whenText'), '') IS NULL OR char_length(p_data->>'whenText') > 4000
      OR nullif(btrim(p_data->>'whereText'), '') IS NULL OR char_length(p_data->>'whereText') > 4000
      OR nullif(btrim(p_data->>'why'), '') IS NULL OR char_length(p_data->>'why') > 4000
      OR nullif(btrim(p_data->>'how'), '') IS NULL OR char_length(p_data->>'how') > 4000
      OR char_length(coalesce(p_data->>'notes', '')) > 10000
      OR char_length(coalesce(p_data->>'flow', '')) > 10000
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_change_summary := concat_ws(', ',
      CASE WHEN v_request.title IS DISTINCT FROM btrim(p_data->>'title') THEN 'title' END,
      CASE WHEN v_request.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
      CASE WHEN v_request.priority::text IS DISTINCT FROM p_data->>'priority' THEN 'priority' END,
      CASE WHEN v_request.category IS DISTINCT FROM p_data->>'category' THEN 'category' END,
      CASE WHEN v_request.due_date IS DISTINCT FROM (p_data->>'dueDate')::timestamptz THEN 'due date' END,
      CASE WHEN v_request.who IS DISTINCT FROM btrim(p_data->>'who') OR v_request.what IS DISTINCT FROM btrim(p_data->>'what')
        OR v_request.when_text IS DISTINCT FROM btrim(p_data->>'whenText') OR v_request.where_text IS DISTINCT FROM btrim(p_data->>'whereText')
        OR v_request.why IS DISTINCT FROM btrim(p_data->>'why') OR v_request.how IS DISTINCT FROM btrim(p_data->>'how') THEN 'request details' END,
      CASE WHEN coalesce(v_request.notes, '') IS DISTINCT FROM btrim(p_data->>'notes') OR coalesce(v_request.flow, '') IS DISTINCT FROM btrim(p_data->>'flow') THEN 'notes' END
    );

    UPDATE public.requests SET
      title = btrim(p_data->>'title'), requested_by = btrim(p_data->>'requestedBy'),
      priority = (p_data->>'priority')::public.request_priority,
      category = p_data->>'category', due_date = (p_data->>'dueDate')::timestamptz,
      who = btrim(p_data->>'who'), what = btrim(p_data->>'what'), when_text = btrim(p_data->>'whenText'),
      where_text = btrim(p_data->>'whereText'), why = btrim(p_data->>'why'), how = btrim(p_data->>'how'),
      notes = nullif(btrim(p_data->>'notes'), ''), flow = nullif(btrim(p_data->>'flow'), '')
    WHERE id = v_request.id;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_request.workspace_id, 'request.requester_updated', 'request', v_request.id,
      format('request.requester_updated:%s:%s', v_request.id, gen_random_uuid()),
      jsonb_build_object(
        'title', btrim(p_data->>'title'), 'status', v_request.status::text,
        'requesterName', btrim(p_data->>'requestedBy'), 'trackingCode', v_code,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_request.id;

  ELSIF p_type = 'booking' THEN
    SELECT * INTO v_booking FROM public.bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_booking.status::text <> 'booked' OR v_booking.checked_out_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

    SELECT coalesce(array_agg(DISTINCT btrim(item) ORDER BY btrim(item)), ARRAY[]::text[])
      INTO v_requested
    FROM jsonb_array_elements_text(p_data->'requestedEquipment') AS item
    WHERE nullif(btrim(item), '') IS NOT NULL;
    v_other := nullif(btrim(p_data->>'otherEquipment'), '');
    IF nullif(btrim(p_data->>'title'), '') IS NULL OR char_length(btrim(p_data->>'title')) > 120
      OR nullif(btrim(p_data->>'bookedBy'), '') IS NULL OR char_length(btrim(p_data->>'bookedBy')) > 200
      OR (p_data->>'checkedOutAt')::timestamptz <= now()
      OR (p_data->>'expectedReturnAt')::timestamptz <= (p_data->>'checkedOutAt')::timestamptz
      OR coalesce(array_length(v_requested, 1), 0) > 50
      OR EXISTS (SELECT 1 FROM unnest(v_requested) AS requested(item) WHERE char_length(item) > 120)
      OR char_length(coalesce(p_data->>'otherEquipment', '')) > 1000
      OR char_length(coalesce(p_data->>'notes', '')) > 10000
      OR (coalesce(array_length(v_requested, 1), 0) = 0 AND v_other IS NULL)
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_change_summary := concat_ws(', ',
      CASE WHEN v_booking.title IS DISTINCT FROM btrim(p_data->>'title') THEN 'title' END,
      CASE WHEN v_booking.booked_by IS DISTINCT FROM btrim(p_data->>'bookedBy') THEN 'requester' END,
      CASE WHEN v_booking.checked_out_at IS DISTINCT FROM (p_data->>'checkedOutAt')::timestamptz
        OR v_booking.expected_return_at IS DISTINCT FROM (p_data->>'expectedReturnAt')::timestamptz THEN 'booking dates' END,
      CASE WHEN v_booking.requested_equipment IS DISTINCT FROM v_requested OR v_booking.other_equipment IS DISTINCT FROM v_other THEN 'equipment' END,
      CASE WHEN coalesce(v_booking.notes, '') IS DISTINCT FROM btrim(p_data->>'notes') THEN 'notes' END
    );

    UPDATE public.bookings SET
      title = btrim(p_data->>'title'), booked_by = btrim(p_data->>'bookedBy'),
      checked_out_at = (p_data->>'checkedOutAt')::timestamptz,
      expected_return_at = (p_data->>'expectedReturnAt')::timestamptz,
      notes = nullif(btrim(p_data->>'notes'), ''), requested_equipment = v_requested, other_equipment = v_other
    WHERE id = v_booking.id;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_booking.workspace_id, 'booking.requester_updated', 'booking', v_booking.id,
      format('booking.requester_updated:%s:%s', v_booking.id, gen_random_uuid()),
      jsonb_build_object(
        'title', btrim(p_data->>'title'), 'status', v_booking.status::text,
        'requesterName', btrim(p_data->>'bookedBy'), 'trackingCode', v_code,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_booking.id;

  ELSIF p_type = 'venue_booking' THEN
    SELECT * INTO v_venue FROM public.venue_bookings WHERE tracking_code = v_code FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
    IF v_venue.status = 'cancelled' OR v_venue.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
    IF v_venue.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

    v_venue_id := (p_data->>'venueId')::uuid;
    v_event_id := nullif(p_data->>'eventId', '')::uuid;
    v_event_other := nullif(btrim(p_data->>'eventOther'), '');
    IF (v_event_id IS NULL) = (v_event_other IS NULL) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    SELECT venue.name INTO v_venue_name
    FROM public.venues AS venue
    WHERE venue.id = v_venue_id AND venue.workspace_id = v_venue.workspace_id
      AND (venue.active OR venue.id = v_venue.venue_id);
    IF v_venue_name IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    IF v_event_id IS NOT NULL THEN
      SELECT event.name INTO v_title
      FROM public.venue_events AS event
      WHERE event.id = v_event_id AND event.workspace_id = v_venue.workspace_id
        AND (event.active OR event.id = v_venue.event_id);
      IF v_title IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    ELSE
      v_title := left(v_event_other, 120);
    END IF;

    SELECT array_agg(DISTINCT slot ORDER BY slot) INTO v_slots
    FROM (
      SELECT value::timestamptz AS slot
      FROM jsonb_array_elements_text(p_data->'slotStarts')
    ) AS requested_slots;
    v_count := coalesce(array_length(v_slots, 1), 0);
    IF v_count = 0 OR v_slots[1] <= now() THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
    v_zone := public.workspace_timezone(v_venue.workspace_id);
    v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
    IF EXISTS (
      SELECT 1 FROM unnest(v_slots) AS slot
      WHERE NOT EXISTS (
        SELECT 1 FROM public.venue_slot_grid(v_venue.workspace_id, v_local_date) AS grid
        WHERE grid.slot_start = slot
      )
    ) OR v_slots[v_count] <> v_slots[1] + make_interval(mins => 30 * (v_count - 1))
    THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

    v_starts_at := v_slots[1];
    v_ends_at := v_slots[v_count] + interval '30 minutes';
    v_change_summary := concat_ws(', ',
      CASE WHEN v_venue.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
      CASE WHEN v_venue.venue_id IS DISTINCT FROM v_venue_id THEN 'venue' END,
      CASE WHEN v_venue.event_id IS DISTINCT FROM v_event_id OR v_venue.event_other IS DISTINCT FROM v_event_other THEN 'event' END,
      CASE WHEN v_venue.starts_at IS DISTINCT FROM v_starts_at OR v_venue.ends_at IS DISTINCT FROM v_ends_at THEN 'booking time' END
    );

    DELETE FROM public.venue_booking_slots WHERE venue_booking_id = v_venue.id;
    UPDATE public.venue_bookings SET
      venue_id = v_venue_id, event_id = v_event_id, event_other = v_event_other,
      title = v_title, requested_by = btrim(p_data->>'requestedBy'),
      starts_at = v_starts_at, ends_at = v_ends_at
    WHERE id = v_venue.id;
    INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, slot_start, slot_end)
    SELECT v_venue.id, v_venue_id, slot, slot + interval '30 minutes' FROM unnest(v_slots) AS slot;

    INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
    VALUES (
      v_venue.workspace_id, 'venue_booking.requester_updated', 'venue_booking', v_venue.id,
      format('venue_booking.requester_updated:%s:%s', v_venue.id, gen_random_uuid()),
      jsonb_build_object(
        'title', v_title, 'requesterName', btrim(p_data->>'requestedBy'), 'trackingCode', v_code,
        'venueName', v_venue_name, 'startsAt', v_starts_at, 'endsAt', v_ends_at,
        'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')
      )
    );
    v_entity_id := v_venue.id;
  ELSE
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'entityId', v_entity_id,
    'submission', public.api_lookup_tracking_submission(v_code)
  );
EXCEPTION
  WHEN check_violation OR not_null_violation OR foreign_key_violation OR unique_violation OR invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'invalid');
END;
$$;


--
-- Name: api_update_tracking_venue_booking(text, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.api_update_tracking_venue_booking(p_tracking_code text, p_updated_at timestamp with time zone, p_data jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
DECLARE
  v_booking public.venue_bookings%ROWTYPE;
  v_venue_id uuid;
  v_event_id uuid;
  v_event_other text;
  v_title text;
  v_venue_name text;
  v_slots timestamptz[];
  v_zone text;
  v_local_date date;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_change_summary text;
  v_recurrence jsonb;
BEGIN
  SELECT * INTO v_booking FROM public.venue_bookings
  WHERE tracking_code = upper(btrim(p_tracking_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_booking.status IN ('cancelled', 'rejected') OR v_booking.starts_at <= now() THEN RETURN jsonb_build_object('error', 'locked'); END IF;
  IF v_booking.updated_at IS DISTINCT FROM p_updated_at THEN RETURN jsonb_build_object('error', 'stale'); END IF;

  v_venue_id := (p_data->>'venueId')::uuid;
  v_event_id := nullif(p_data->>'eventId', '')::uuid;
  v_event_other := nullif(btrim(p_data->>'eventOther'), '');
  v_recurrence := p_data->'recurrence';
  IF jsonb_typeof(v_recurrence) = 'null' THEN v_recurrence := NULL; END IF;
  IF nullif(btrim(p_data->>'requestedBy'), '') IS NULL OR char_length(btrim(p_data->>'requestedBy')) > 200
    OR (v_event_id IS NULL) = (v_event_other IS NULL) OR char_length(coalesce(v_event_other, '')) > 120
  THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  SELECT venue.name INTO v_venue_name FROM public.venues AS venue
  WHERE venue.id = v_venue_id AND venue.workspace_id = v_booking.workspace_id
    AND (venue.active OR venue.id = v_booking.venue_id);
  IF v_venue_name IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  IF v_event_id IS NOT NULL THEN
    SELECT event.name INTO v_title FROM public.venue_events AS event
    WHERE event.id = v_event_id AND event.workspace_id = v_booking.workspace_id
      AND (event.active OR event.id = v_booking.event_id);
    IF v_title IS NULL THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  ELSE
    v_title := v_event_other;
  END IF;

  SELECT array_agg(DISTINCT value::timestamptz ORDER BY value::timestamptz) INTO v_slots
  FROM jsonb_array_elements_text(p_data->'slotStarts') AS requested(value);
  IF coalesce(array_length(v_slots, 1), 0) = 0 OR v_slots[1] <= now() THEN RETURN jsonb_build_object('error', 'invalid'); END IF;
  v_zone := public.workspace_timezone(v_booking.workspace_id);
  v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
  IF EXISTS (
    SELECT 1 FROM unnest(v_slots) AS slot
    WHERE NOT EXISTS (SELECT 1 FROM public.venue_slot_grid(v_booking.workspace_id, v_local_date) AS grid WHERE grid.slot_start = slot)
  ) OR v_slots[array_length(v_slots, 1)] <> v_slots[1] + make_interval(mins => 30 * (array_length(v_slots, 1) - 1))
  THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  DROP TABLE IF EXISTS pg_temp.recurrence_slots;
  CREATE TEMP TABLE recurrence_slots ON COMMIT DROP AS
  SELECT * FROM moc_private.expand_venue_booking_slots(v_booking.workspace_id, v_slots, v_recurrence);
  IF EXISTS (
    SELECT 1 FROM recurrence_slots AS requested
    WHERE NOT EXISTS (
      SELECT 1 FROM public.venue_slot_grid(v_booking.workspace_id, (requested.slot_start AT TIME ZONE v_zone)::date) AS grid
      WHERE grid.slot_start = requested.slot_start
    )
  ) THEN RETURN jsonb_build_object('error', 'invalid'); END IF;

  SELECT min(slot_start), max(slot_end) FILTER (WHERE occurrence_index = 0)
  INTO v_starts_at, v_ends_at FROM recurrence_slots;
  v_change_summary := concat_ws(', ',
    CASE WHEN v_booking.requested_by IS DISTINCT FROM btrim(p_data->>'requestedBy') THEN 'requester' END,
    CASE WHEN v_booking.venue_id IS DISTINCT FROM v_venue_id THEN 'venue' END,
    CASE WHEN v_booking.event_id IS DISTINCT FROM v_event_id OR v_booking.event_other IS DISTINCT FROM v_event_other THEN 'event' END,
    CASE WHEN v_booking.starts_at IS DISTINCT FROM v_starts_at OR v_booking.ends_at IS DISTINCT FROM v_ends_at THEN 'booking time' END,
    CASE WHEN v_booking.recurrence IS DISTINCT FROM v_recurrence THEN 'repeat pattern' END
  );

  DELETE FROM public.venue_booking_slots WHERE venue_booking_id = v_booking.id;
  UPDATE public.venue_bookings SET venue_id = v_venue_id, event_id = v_event_id,
    event_other = v_event_other, title = v_title, requested_by = btrim(p_data->>'requestedBy'),
    starts_at = v_starts_at, ends_at = v_ends_at, recurrence = v_recurrence
  WHERE id = v_booking.id;
  INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, occurrence_index, slot_start, slot_end)
  SELECT v_booking.id, v_venue_id, occurrence_index, slot_start, slot_end FROM recurrence_slots;

  INSERT INTO public.notification_outbox (workspace_id, event_type, entity_type, entity_id, event_key, payload)
  VALUES (v_booking.workspace_id, 'venue_booking.requester_updated', 'venue_booking', v_booking.id,
    format('venue_booking.requester_updated:%s:%s', v_booking.id, gen_random_uuid()),
    jsonb_build_object('title', v_title, 'requesterName', btrim(p_data->>'requestedBy'),
      'trackingCode', upper(btrim(p_tracking_code)), 'venueName', v_venue_name,
      'startsAt', v_starts_at, 'endsAt', v_ends_at,
      'changeSummary', coalesce(nullif(v_change_summary, ''), 'Submission details')));

  RETURN jsonb_build_object('entityId', v_booking.id,
    'submission', public.api_lookup_tracking_venue_booking(p_tracking_code));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'conflict');
  WHEN check_violation OR not_null_violation OR foreign_key_violation OR invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'invalid');
END;
$$;


--
-- Name: approve_workspace_join_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_workspace_join_request(p_request_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_request public.workspace_join_requests%ROWTYPE;
  v_viewer_role_id uuid;
BEGIN
  SELECT * INTO v_request
  FROM public.workspace_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending access request not found';
  END IF;

  IF NOT moc_private.current_user_can(v_request.workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_viewer_role_id
  FROM public.roles
  WHERE name = 'viewer';

  IF v_viewer_role_id IS NULL THEN
    RAISE EXCEPTION 'Viewer role is missing';
  END IF;

  INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
  VALUES (v_request.workspace_id, v_request.user_id, v_viewer_role_id)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  DELETE FROM public.workspace_join_requests WHERE id = p_request_id;
  RETURN v_request.user_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    priority public.request_priority NOT NULL,
    status public.request_status DEFAULT 'not_started'::public.request_status NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_by text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    who text NOT NULL,
    what text NOT NULL,
    when_text text NOT NULL,
    where_text text NOT NULL,
    why text NOT NULL,
    how text NOT NULL,
    notes text,
    flow text,
    content text,
    tracking_code text NOT NULL
);


--
-- Name: archive_completed_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_completed_requests() RETURNS SETOF public.requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Bulk auto-archive is silent by design; the flag is transaction-local so
  -- manual archives (and every other status change) still notify.
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);
  RETURN QUERY
  UPDATE public.requests r
  SET status = 'archived',
      updated_at = now()
  WHERE r.id IN (
    SELECT r2.id
    FROM public.requests r2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = r2.workspace_id
    WHERE r2.status = 'completed'
      AND r2.updated_at < now() - make_interval(days => coalesce(ns.auto_archive_completed_requests_days, 7))
  )
  RETURNING r.*;
END;
$$;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    tracking_code text NOT NULL,
    title text NOT NULL,
    booked_by text NOT NULL,
    checked_out_at timestamp with time zone NOT NULL,
    expected_return_at timestamp with time zone NOT NULL,
    returned_at timestamp with time zone,
    notes text,
    status public.booking_status DEFAULT 'booked'::public.booking_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_equipment text[] DEFAULT ARRAY[]::text[] NOT NULL,
    other_equipment text,
    CONSTRAINT bookings_title_check CHECK (((char_length(title) > 0) AND (char_length(title) <= 120)))
);


--
-- Name: archive_returned_bookings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_returned_bookings() RETURNS SETOF public.bookings
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM set_config('moc.suppress_item_notifications', 'on', true);
  RETURN QUERY
  UPDATE public.bookings b
  SET status = 'archived',
      updated_at = now()
  WHERE b.id IN (
    SELECT b2.id
    FROM public.bookings b2
    LEFT JOIN public.notification_settings ns ON ns.workspace_id = b2.workspace_id
    WHERE b2.status = 'returned'
      AND coalesce(b2.returned_at, b2.updated_at) < now() - make_interval(days => coalesce(ns.auto_archive_returned_bookings_days, 7))
  )
  RETURNING b.*;
END;
$$;


--
-- Name: begin_scheduled_delivery(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.begin_scheduled_delivery(p_delivery uuid) RETURNS jsonb
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


--
-- Name: change_scheduled_occurrence(uuid, uuid, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.change_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_field text, p_value text, p_scope text DEFAULT 'occurrence'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: claim_notification_ingest_nonce(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_notification_ingest_nonce(p_nonce text, p_expires_at timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF char_length(coalesce(p_nonce, '')) NOT BETWEEN 1 AND 256
    OR p_expires_at IS NULL
    OR p_expires_at <= now()
  THEN
    RAISE EXCEPTION 'Invalid notification ingest nonce' USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.notification_ingest_replays
  WHERE nonce = p_nonce AND expires_at <= now();

  INSERT INTO public.notification_ingest_replays (nonce, expires_at)
  VALUES (p_nonce, p_expires_at)
  ON CONFLICT (nonce) DO NOTHING;
  RETURN FOUND;
END;
$$;


--
-- Name: claim_telegram_webhook_update(bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_telegram_webhook_update(p_update_id bigint, p_payload jsonb) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_status text;
BEGIN
  IF p_update_id IS NULL OR p_update_id < 0 OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid Telegram update payload' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.telegram_webhook_updates (update_id, payload)
  VALUES (p_update_id, p_payload)
  ON CONFLICT (update_id) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  UPDATE public.telegram_webhook_updates
  SET payload = p_payload,
      status = 'processing',
      attempts = attempts + 1,
      processing_started_at = now(),
      processed_at = NULL,
      last_error = NULL
  WHERE update_id = p_update_id
    AND (
      status = 'failed'
      OR (status = 'processing' AND processing_started_at < now() - interval '5 minutes')
    );
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  SELECT status INTO v_status
  FROM public.telegram_webhook_updates
  WHERE update_id = p_update_id;
  -- 'processing' here means another invocation holds a fresh claim. Report it
  -- in the API's vocabulary so the duplicate gets a retryable 503 instead of
  -- an unexpected value.
  RETURN CASE WHEN v_status = 'processed' THEN 'processed' ELSE 'in_progress' END;
END;
$$;


--
-- Name: cleanup_zoom_meeting_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_zoom_meeting_notifications() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  DELETE FROM public.notification_deliveries
  WHERE event_key = format('meeting.created:%s', OLD.id);

  DELETE FROM public.notification_outbox
  WHERE event_type = 'meeting.created'
    AND entity_type = 'meeting'
    AND entity_id = OLD.id
    AND workspace_id = OLD.workspace_id
    AND event_key = format('meeting.created:%s', OLD.id);

  RETURN OLD;
END;
$$;


--
-- Name: complete_integration_oauth_token_refresh(text, uuid, text, uuid, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_integration_oauth_token_refresh(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
BEGIN
  UPDATE moc_private.integration_oauth_tokens
  SET access_token = p_access_token,
      refresh_token = p_refresh_token,
      token_expires_at = p_token_expires_at,
      refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
    AND refresh_lock_id = p_lock_id
    AND refresh_lock_expires_at > now();
  RETURN FOUND;
END;
$$;


--
-- Name: complete_telegram_webhook_update(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_telegram_webhook_update(p_update_id bigint) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  UPDATE public.telegram_webhook_updates
  SET status = 'processed',
      processed_at = now(),
      processing_started_at = NULL,
      last_error = NULL
  WHERE update_id = p_update_id
    AND status = 'processing';
$$;


--
-- Name: consume_api_rate_limit(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_api_rate_limit(p_policy text, p_subject_hash text) RETURNS TABLE(allowed boolean, limit_value integer, remaining integer, retry_after_seconds integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
DECLARE
  v_limit integer;
  v_window_seconds integer;
  v_window_started_at timestamptz;
  v_count integer;
  v_window_end timestamptz;
BEGIN
  CASE p_policy
    WHEN 'public_notification_wake' THEN v_limit := 12; v_window_seconds := 60;
    WHEN 'signed_ingest' THEN v_limit := 120; v_window_seconds := 60;
    WHEN 'oauth_mutation' THEN v_limit := 20; v_window_seconds := 300;
    WHEN 'provider_proxy_read' THEN v_limit := 120; v_window_seconds := 60;
    WHEN 'provider_proxy_write' THEN v_limit := 30; v_window_seconds := 300;
    WHEN 'telegram_webhook' THEN v_limit := 100; v_window_seconds := 60;
    WHEN 'telegram_mini_app' THEN v_limit := 60; v_window_seconds := 60;
    WHEN 'authenticated_notification_mutation' THEN v_limit := 30; v_window_seconds := 60;
    WHEN 'public_submission_lookup' THEN v_limit := 20; v_window_seconds := 60;
    WHEN 'public_submission_mutation' THEN v_limit := 8; v_window_seconds := 300;
    ELSE RAISE EXCEPTION 'Unknown API rate-limit policy' USING ERRCODE = 'check_violation';
  END CASE;

  IF p_subject_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid API rate-limit subject' USING ERRCODE = 'check_violation';
  END IF;

  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM statement_timestamp()) / v_window_seconds) * v_window_seconds
  );
  v_window_end := v_window_started_at + make_interval(secs => v_window_seconds);

  INSERT INTO public.api_rate_limit_windows (policy, subject_hash, window_started_at, request_count)
  VALUES (p_policy, p_subject_hash, v_window_started_at, 1)
  ON CONFLICT (policy, subject_hash, window_started_at) DO UPDATE
  SET request_count = public.api_rate_limit_windows.request_count + 1,
      updated_at = now()
  WHERE public.api_rate_limit_windows.request_count < v_limit
  RETURNING request_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT request_count INTO v_count
    FROM public.api_rate_limit_windows
    WHERE policy = p_policy
      AND subject_hash = p_subject_hash
      AND window_started_at = v_window_started_at;
    RETURN QUERY SELECT false, v_limit, greatest(v_limit - coalesce(v_count, v_limit), 0),
      greatest(1, ceil(extract(epoch FROM v_window_end - now())))::integer;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_limit, greatest(v_limit - v_count, 0), 0;
END;
$_$;


--
-- Name: consume_telegram_link_token(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_telegram_link_token(p_token text, p_telegram_chat_id text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF nullif(btrim(p_token), '') IS NULL OR nullif(btrim(p_telegram_chat_id), '') IS NULL THEN
    RETURN 'invalid_or_expired';
  END IF;

  DELETE FROM public.telegram_link_tokens
  WHERE token = p_token
    AND expires_at > now()
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN 'invalid_or_expired';
  END IF;

  UPDATE public.users
  SET telegram_chat_id = p_telegram_chat_id
  WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Link token user does not exist';
  END IF;

  RETURN 'linked';
END;
$$;


--
-- Name: create_broadcast_with_items(uuid, uuid, text, text, text, public.broadcast_kind, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid, p_title text, p_description text, p_slug text, p_kind public.broadcast_kind, p_items jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_item_count integer;
BEGIN
  IF moc_private.actor_id() IS NULL OR NOT moc_private.current_user_can(p_workspace_id, 'can_create') THEN
    RAISE EXCEPTION 'You do not have permission to create broadcasts in this workspace' USING ERRCODE = '42501';
  END IF;

  IF nullif(trim(p_title), '') IS NULL OR nullif(trim(p_slug), '') IS NULL THEN
    RAISE EXCEPTION 'Broadcast title and slug are required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A broadcast needs at least one playlist item' USING ERRCODE = '22023';
  END IF;

  v_item_count := jsonb_array_length(p_items);

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(
      sort_order integer,
      storage_bucket text,
      storage_path text,
      mime_type text,
      file_size_bytes bigint,
      duration_seconds numeric
    )
    WHERE item.sort_order < 0
      OR item.sort_order >= v_item_count
      OR item.storage_bucket <> 'broadcast-media'
      OR item.storage_path NOT LIKE p_workspace_id::text || '/' || moc_private.actor_id()::text || '/' || p_broadcast_id::text || '/%'
      OR item.mime_type NOT LIKE p_kind::text || '/%'
      OR item.file_size_bytes < 0
      OR item.duration_seconds < 0
  ) OR (
    SELECT count(DISTINCT item.sort_order)
    FROM jsonb_to_recordset(p_items) AS item(sort_order integer)
  ) <> v_item_count THEN
    RAISE EXCEPTION 'Broadcast playlist items are invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.broadcasts (id, workspace_id, created_by, title, description, slug, kind)
  VALUES (p_broadcast_id, p_workspace_id, moc_private.actor_id(), trim(p_title), coalesce(trim(p_description), ''), trim(p_slug), p_kind);

  INSERT INTO public.broadcast_items (
    id,
    broadcast_id,
    title,
    sort_order,
    storage_bucket,
    storage_path,
    public_url,
    mime_type,
    file_size_bytes,
    duration_seconds,
    created_at
  )
  SELECT
    coalesce(item.id, gen_random_uuid()),
    p_broadcast_id,
    item.title,
    item.sort_order,
    item.storage_bucket,
    item.storage_path,
    item.public_url,
    item.mime_type,
    item.file_size_bytes,
    item.duration_seconds,
    coalesce(item.created_at, now())
  FROM jsonb_to_recordset(p_items) AS item(
    id uuid,
    title text,
    sort_order integer,
    storage_bucket text,
    storage_path text,
    public_url text,
    mime_type text,
    file_size_bytes bigint,
    duration_seconds numeric,
    created_at timestamptz
  )
  ORDER BY item.sort_order;
END;
$$;


--
-- Name: create_checklist_from_template(uuid, timestamp with time zone, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_checklist_from_template(p_template_id uuid, p_scheduled_at timestamp with time zone, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
DECLARE
  v_template      RECORD;
  v_checklist_id  uuid;
  v_section_map   RECORD;
BEGIN
  SELECT id, workspace_id, name, description
  INTO v_template
  FROM public.checklist_templates
  WHERE id = p_template_id;

  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Checklist template "%" not found.', p_template_id;
  END IF;

  INSERT INTO public.checklists (workspace_id, name, description, scheduled_at)
  VALUES (
    v_template.workspace_id,
    coalesce(p_name, v_template.name),
    coalesce(p_description, v_template.description),
    p_scheduled_at
  )
  RETURNING id INTO v_checklist_id;

  FOR v_section_map IN
    WITH inserted_sections AS (
      INSERT INTO public.checklist_sections (checklist_id, name, sort_order)
      SELECT v_checklist_id, ts.name, ts.sort_order
      FROM public.template_sections ts
      WHERE ts.checklist_template_id = p_template_id
      ORDER BY ts.sort_order
      RETURNING id, sort_order
    )
    SELECT
      ts.id  AS old_section_id,
      ins.id AS new_section_id
    FROM public.template_sections ts
    JOIN inserted_sections ins ON ins.sort_order = ts.sort_order
    WHERE ts.checklist_template_id = p_template_id
  LOOP
    INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
    SELECT
      v_checklist_id,
      v_section_map.new_section_id,
      ti.label,
      false,
      ti.sort_order
    FROM public.template_items ti
    WHERE ti.checklist_template_id = p_template_id
      AND ti.template_section_id = v_section_map.old_section_id;
  END LOOP;

  INSERT INTO public.checklist_items (checklist_id, section_id, label, checked, sort_order)
  SELECT
    v_checklist_id,
    NULL,
    ti.label,
    false,
    ti.sort_order
  FROM public.template_items ti
  WHERE ti.checklist_template_id = p_template_id
    AND ti.template_section_id IS NULL;

  RETURN v_checklist_id;
END;
$$;


--
-- Name: create_scheduled_schedule(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_scheduled_schedule(p_actor uuid, p_workspace uuid, p_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $_$
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
END $_$;


--
-- Name: delete_broadcast_with_items(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid) RETURNS TABLE(storage_path text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF moc_private.actor_id() IS NULL OR NOT moc_private.current_user_can(p_workspace_id, 'can_delete') THEN
    RAISE EXCEPTION 'You do not have permission to delete this broadcast' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.broadcasts
  WHERE broadcasts.id = p_broadcast_id
    AND broadcasts.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT broadcast_items.storage_path
  FROM public.broadcast_items
  WHERE broadcast_items.broadcast_id = p_broadcast_id
  ORDER BY broadcast_items.sort_order;

  DELETE FROM public.broadcasts
  WHERE broadcasts.id = p_broadcast_id
    AND broadcasts.workspace_id = p_workspace_id;
END;
$$;


--
-- Name: delete_integration_oauth_connection(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_integration_oauth_connection(p_provider text, p_workspace_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom') THEN
    RAISE EXCEPTION 'Unknown integration provider' USING ERRCODE = 'check_violation';
  END IF;

  IF p_provider = 'youtube' THEN
    DELETE FROM moc_private.integration_oauth_tokens
    WHERE provider = p_provider AND workspace_id = p_workspace_id;
    DELETE FROM public.youtube_connections WHERE workspace_id = p_workspace_id;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  DELETE FROM public.notification_deliveries AS delivery
  USING public.zoom_meetings AS meeting
  WHERE meeting.workspace_id = p_workspace_id
    AND delivery.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.notification_outbox AS outbox_row
  USING public.zoom_meetings AS meeting
  WHERE meeting.workspace_id = p_workspace_id
    AND outbox_row.event_type = 'meeting.created'
    AND outbox_row.entity_type = 'meeting'
    AND outbox_row.entity_id = meeting.id
    AND outbox_row.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.zoom_meetings WHERE workspace_id = p_workspace_id;
  DELETE FROM moc_private.integration_oauth_tokens
  WHERE provider = p_provider AND workspace_id = p_workspace_id;
  DELETE FROM public.zoom_connections WHERE workspace_id = p_workspace_id;
END;
$$;


--
-- Name: delete_scheduled_occurrence(uuid, uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_scope text DEFAULT 'occurrence'::text) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: delete_scheduled_template(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_scheduled_template(p_actor uuid, p_workspace uuid, p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 UPDATE scheduled_message_templates SET deleted_at=coalesce(deleted_at,clock_timestamp())
 WHERE id=p_id AND workspace_id=p_workspace;
 IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
END $$;


--
-- Name: delete_zoom_integrations_for_user(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_zoom_integrations_for_user(p_zoom_user_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
BEGIN
  IF nullif(btrim(p_zoom_user_id), '') IS NULL THEN
    RAISE EXCEPTION 'A Zoom user identifier is required' USING ERRCODE = 'not_null_violation';
  END IF;

  PERFORM 1
  FROM public.zoom_connections
  WHERE zoom_user_id = p_zoom_user_id
  FOR UPDATE;

  DELETE FROM public.notification_deliveries AS delivery
  USING public.zoom_meetings AS meeting
  JOIN public.zoom_connections AS connection
    ON connection.workspace_id = meeting.workspace_id
  WHERE connection.zoom_user_id = p_zoom_user_id
    AND delivery.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.notification_outbox AS outbox_row
  USING public.zoom_meetings AS meeting
  JOIN public.zoom_connections AS connection
    ON connection.workspace_id = meeting.workspace_id
  WHERE connection.zoom_user_id = p_zoom_user_id
    AND outbox_row.event_type = 'meeting.created'
    AND outbox_row.entity_type = 'meeting'
    AND outbox_row.entity_id = meeting.id
    AND outbox_row.event_key = format('meeting.created:%s', meeting.id);

  DELETE FROM public.zoom_meetings AS meeting
  USING public.zoom_connections AS connection
  WHERE connection.workspace_id = meeting.workspace_id
    AND connection.zoom_user_id = p_zoom_user_id;

  DELETE FROM moc_private.integration_oauth_tokens
  WHERE provider = 'zoom'
    AND workspace_id IN (
      SELECT workspace_id
      FROM public.zoom_connections
      WHERE zoom_user_id = p_zoom_user_id
    );

  DELETE FROM public.zoom_connections
  WHERE zoom_user_id = p_zoom_user_id;
END;
$$;


--
-- Name: enforce_booking_item_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_booking_item_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.equipment e ON e.workspace_id = b.workspace_id
    WHERE b.id = NEW.booking_id
      AND e.id = NEW.equipment_id
  ) THEN
    RAISE EXCEPTION 'Booking equipment must belong to the booking workspace';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_checklist_assignee_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_checklist_assignee_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.checklist_items ci
    JOIN public.checklists c ON c.id = ci.checklist_id
    JOIN public.workspace_users wu ON wu.workspace_id = c.workspace_id
    WHERE ci.id = NEW.checklist_item_id
      AND wu.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Checklist assignee must be a member of the checklist workspace';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_checklist_item_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_checklist_item_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.section_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.checklist_sections s
    WHERE s.id = NEW.section_id
      AND s.checklist_id = NEW.checklist_id
  ) THEN
    RAISE EXCEPTION 'Checklist item section must belong to the same checklist';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_checklist_request_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_checklist_request_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = NEW.request_id
      AND r.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Checklist request must belong to the same workspace';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_request_assignee_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_request_assignee_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.requests r
    JOIN public.workspace_users wu ON wu.workspace_id = r.workspace_id
    WHERE r.id = NEW.request_id
      AND wu.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Request assignee must be a member of the request workspace';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_template_item_workspace(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_template_item_workspace() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.template_section_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.template_sections s
    WHERE s.id = NEW.template_section_id
      AND s.checklist_template_id = NEW.checklist_template_id
  ) THEN
    RAISE EXCEPTION 'Template item section must belong to the same checklist template';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: enforce_venue_booking_slot_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_venue_booking_slot_parent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_venue_id uuid;
  v_released boolean;
BEGIN
  SELECT venue_id, status IN ('cancelled', 'rejected')
    INTO v_venue_id, v_released
  FROM public.venue_bookings
  WHERE id = NEW.venue_booking_id;

  IF v_venue_id IS NULL THEN
    RAISE EXCEPTION 'Unknown venue booking' USING ERRCODE = 'foreign_key_violation';
  END IF;

  NEW.venue_id := v_venue_id;
  NEW.active := NOT v_released;
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_booking_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_booking_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_type text;
BEGIN
  IF coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'booking.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'booking.status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'booking',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.booked_by,
      'trackingCode', NEW.tracking_code
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_meeting_created_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_meeting_created_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'meeting.created',
    'meeting',
    NEW.id,
    format('meeting.created:%s', NEW.id),
    jsonb_build_object(
      'topic', NEW.topic,
      'startTime', NEW.start_time,
      'joinUrl', NEW.join_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_notification_outbox_event(uuid, text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_notification_outbox_event(p_workspace_id uuid, p_event_type text, p_entity_type text, p_entity_id uuid, p_event_key text, p_payload jsonb) RETURNS TABLE(id uuid, status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF nullif(btrim(p_event_type), '') IS NULL
    OR nullif(btrim(p_entity_type), '') IS NULL
    OR p_entity_id IS NULL
    OR nullif(btrim(p_event_key), '') IS NULL
    OR jsonb_typeof(p_payload) <> 'object'
  THEN
    RAISE EXCEPTION 'Invalid notification outbox event' USING ERRCODE = 'check_violation';
  END IF;

  RETURN QUERY
  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    p_workspace_id, p_event_type, p_entity_type, p_entity_id, p_event_key, p_payload
  )
  ON CONFLICT (event_key) DO UPDATE
  SET payload = public.notification_outbox.payload || EXCLUDED.payload
  RETURNING notification_outbox.id, notification_outbox.status;
END;
$$;


--
-- Name: enqueue_request_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_request_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_type text;
BEGIN
  IF coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'request.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := CASE WHEN NEW.status = 'archived'
      THEN 'request.archived'
      ELSE 'request.status_changed'
    END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'request',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'requesterName', NEW.requested_by,
      'requestId', NEW.id
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_stream_created_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_stream_created_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.stream_status = 'complete' OR NEW.actual_end_time IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.stream_status <> 'live'
    AND NEW.scheduled_start_time IS NOT NULL
    AND NEW.scheduled_start_time < now() - interval '1 hour'
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'stream.created',
    'stream',
    NEW.id,
    format('stream.created:%s', NEW.id),
    jsonb_build_object(
      'title', NEW.title,
      'scheduledStartTime', NEW.scheduled_start_time,
      'streamUrl', NEW.stream_url
    )
  ) ON CONFLICT (event_key) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_venue_booking_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_venue_booking_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_event_type text;
  v_venue_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'venue_booking.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
    v_event_type := 'venue_booking.cancelled';
  ELSE
    RETURN NEW;
  END IF;

  SELECT name INTO v_venue_name FROM public.venues WHERE id = NEW.venue_id;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    v_event_type,
    'venue_booking',
    NEW.id,
    format('%s:%s:%s', v_event_type, NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'requesterName', NEW.requested_by,
      'trackingCode', NEW.tracking_code,
      'venueName', v_venue_name,
      -- The renderer derives the phase from these at send time.
      'startsAt', NEW.starts_at,
      'endsAt', NEW.ends_at
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: enqueue_venue_booking_status_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_venue_booking_status_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_venue_name text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     OR NEW.status = 'cancelled'
     OR (OLD.status = 'approved' AND NEW.status = 'auto')
     OR coalesce(current_setting('moc.suppress_item_notifications', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_venue_name FROM public.venues WHERE id = NEW.venue_id;

  INSERT INTO public.notification_outbox (
    workspace_id, event_type, entity_type, entity_id, event_key, payload
  ) VALUES (
    NEW.workspace_id,
    'venue_booking.status_changed',
    'venue_booking',
    NEW.id,
    format('venue_booking.status_changed:%s:%s', NEW.id, gen_random_uuid()),
    jsonb_build_object(
      'title', NEW.title,
      'requesterName', NEW.requested_by,
      'trackingCode', NEW.tracking_code,
      'venueName', v_venue_name,
      'startsAt', NEW.starts_at,
      'endsAt', NEW.ends_at,
      'decision', NEW.status::text
    )
  );
  RETURN NEW;
END;
$$;


--
-- Name: fail_telegram_webhook_update(bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fail_telegram_webhook_update(p_update_id bigint, p_error text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  UPDATE public.telegram_webhook_updates
  SET status = 'failed',
      processing_started_at = NULL,
      last_error = left(coalesce(p_error, 'Unknown Telegram processing error'), 1_000)
  WHERE update_id = p_update_id
    AND status = 'processing';
$$;


--
-- Name: finish_scheduled_delivery(uuid, integer, bigint, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finish_scheduled_delivery(p_delivery uuid, p_revision integer, p_message bigint, p_error text DEFAULT NULL::text, p_ambiguous boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: generate_tracking_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_tracking_code(p_prefix text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF p_prefix NOT IN ('REQ', 'BKG', 'VEN') THEN
    RAISE EXCEPTION 'Invalid tracking-code prefix' USING ERRCODE = 'check_violation';
  END IF;
  RETURN p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
END;
$$;


--
-- Name: get_integration_oauth_tokens(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_integration_oauth_tokens(p_provider text, p_workspace_id uuid) RETURNS TABLE(access_token text, refresh_token text, token_expires_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private'
    AS $$
  SELECT access_token, refresh_token, token_expires_at
  FROM moc_private.integration_oauth_tokens
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id;
$$;


--
-- Name: list_signup_workspaces(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_signup_workspaces() RETURNS TABLE(id uuid, name text, slug text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id, name, slug
  FROM public.workspaces
  ORDER BY name;
$$;


--
-- Name: mark_integration_oauth_reauth_required_if_refresh_token_matches(text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(p_provider text, p_workspace_id uuid, p_expected_refresh_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR nullif(btrim(p_expected_refresh_token), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth reauthentication state' USING ERRCODE = 'check_violation';
  END IF;

  IF p_provider = 'youtube' THEN
    PERFORM 1
    FROM moc_private.integration_oauth_tokens
    WHERE provider = p_provider
      AND workspace_id = p_workspace_id
      AND refresh_token = p_expected_refresh_token
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN false;
    END IF;

    UPDATE public.youtube_connections
    SET status = 'reauth_required'
    WHERE workspace_id = p_workspace_id;
    RETURN FOUND;
  END IF;

  PERFORM 1
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM 1
  FROM moc_private.integration_oauth_tokens
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.zoom_connections
  SET status = 'reauth_required'
  WHERE workspace_id = p_workspace_id;
  RETURN true;
END;
$$;


--
-- Name: materialize_scheduled_messages(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.materialize_scheduled_messages(p_schedule uuid DEFAULT NULL::uuid) RETURNS void
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
   INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,attendance_groups)
   VALUES(s.workspace_id,s.id,d,((d+s.send_time) AT TIME ZONE s.timezone),((d+s.send_time) AT TIME ZONE s.timezone)+make_interval(secs=>round(h*3600)::double precision),f,s.body,s.message_type,s.audience,s.require_arrival,g) ON CONFLICT DO NOTHING;
  END LOOP;
 END LOOP;
END $$;


--
-- Name: prepare_scheduled_messages(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prepare_scheduled_messages() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: protect_last_workspace_manager(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_last_workspace_manager() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_old_can_manage boolean;
  v_new_can_manage boolean := false;
BEGIN
  SELECT can_manage_roles INTO v_old_can_manage
  FROM public.roles
  WHERE id = OLD.role_id;

  IF TG_OP = 'UPDATE' THEN
    SELECT can_manage_roles INTO v_new_can_manage
    FROM public.roles
    WHERE id = NEW.role_id;
  END IF;

  IF coalesce(v_old_can_manage, false)
    AND NOT coalesce(v_new_can_manage, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.workspace_users AS other_membership
      JOIN public.roles AS other_role ON other_role.id = other_membership.role_id
      WHERE other_membership.workspace_id = OLD.workspace_id
        AND other_membership.user_id <> OLD.user_id
        AND other_role.can_manage_roles
    )
  THEN
    RAISE EXCEPTION 'A workspace must retain at least one role manager';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


--
-- Name: public_browse_equipment(uuid, timestamp with time zone, timestamp with time zone, text, public.equipment_category); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expected_return_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_search text DEFAULT NULL::text, p_category public.equipment_category DEFAULT NULL::public.equipment_category) RETURNS TABLE(id uuid, workspace_id uuid, name text, serial_number text, category public.equipment_category, status public.equipment_status, location text, notes text, last_active_on date, thumbnail_url text, is_available boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.workspace_id, e.name, e.serial_number,
      e.category, e.status, e.location, e.notes,
      e.last_active_on, e.thumbnail_url,
      CASE
        WHEN e.status = 'maintenance' THEN false
        WHEN p_checked_out_at IS NULL OR p_expected_return_at IS NULL THEN
          e.status <> 'maintenance'
        ELSE NOT EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status NOT IN ('returned', 'archived')
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        )
      END AS is_available
    FROM public.equipment e
    WHERE e.workspace_id = p_workspace_id
      AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR e.category = p_category)
    ORDER BY
      CASE
        WHEN e.status = 'maintenance' THEN 1
        WHEN p_checked_out_at IS NOT NULL AND p_expected_return_at IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.booking_items bi
          JOIN public.bookings b ON b.id = bi.booking_id
          WHERE bi.equipment_id = e.id
            AND b.status NOT IN ('returned', 'archived')
            AND b.checked_out_at  <  p_expected_return_at
            AND b.expected_return_at > p_checked_out_at
        ) THEN 1
        ELSE 0
      END,
      e.name;
END;
$$;


--
-- Name: public_list_request_categories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_list_request_categories(p_workspace_id uuid) RETURNS TABLE(key text, name text, description text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT category.key, category.name, category.description
  FROM public.request_categories AS category
  WHERE category.workspace_id = p_workspace_id AND category.active
  ORDER BY category.sort_order, category.name;
$$;


--
-- Name: public_list_venue_events(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_list_venue_events(p_workspace_id uuid) RETURNS TABLE(id uuid, name text, description text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT event.id, event.name, event.description
  FROM public.venue_events AS event
  WHERE event.workspace_id = p_workspace_id
    AND event.active
  ORDER BY event.sort_order, event.name;
$$;


--
-- Name: public_list_venues(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_list_venues(p_workspace_id uuid) RETURNS TABLE(id uuid, name text, description text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT venue.id, venue.name, venue.description
  FROM public.venues AS venue
  WHERE venue.workspace_id = p_workspace_id AND venue.active
  ORDER BY venue.sort_order, venue.name;
$$;


--
-- Name: public_lookup_tracking(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_lookup_tracking(p_tracking_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_result jsonb;
  v_code   text := upper(btrim(p_tracking_code));
BEGIN
  SELECT jsonb_build_object(
    'type', 'request',
    'id', r.id,
    'trackingCode', r.tracking_code,
    'title', r.title,
    'status', r.status::text,
    'priority', r.priority::text,
    'category', r.category::text,
    'requestedBy', r.requested_by,
    'dueDate', r.due_date,
    'createdAt', r.created_at
  ) INTO v_result
  FROM public.requests r
  WHERE r.tracking_code = v_code;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'type', 'booking',
    'id', b.id,
    'trackingCode', b.tracking_code,
    'title', b.title,
    'status', b.status::text,
    'bookedBy', b.booked_by,
    'checkedOutAt', b.checked_out_at,
    'expectedReturnAt', b.expected_return_at,
    'returnedAt', b.returned_at,
    'notes', b.notes,
    'createdAt', b.created_at,
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', bi.id,
        'equipmentId', e.id,
        'equipmentName', e.name,
        'equipmentCategory', e.category::text
      ) ORDER BY e.name), '[]'::jsonb)
      FROM public.booking_items bi
      JOIN public.equipment e ON e.id = bi.equipment_id
      WHERE bi.booking_id = b.id
    )
  ) INTO v_result
  FROM public.bookings b
  WHERE b.tracking_code = v_code;

  IF v_result IS NOT NULL THEN
    RETURN v_result;
  END IF;

  SELECT jsonb_build_object(
    'type', 'venue_booking',
    'id', vb.id,
    'trackingCode', vb.tracking_code,
    'title', vb.title,
    'status', public.venue_booking_phase(vb.status, vb.starts_at, vb.ends_at),
    'requestedBy', vb.requested_by,
    'venueName', venue.name,
    'venueDescription', venue.description,
    'startsAt', vb.starts_at,
    'endsAt', vb.ends_at,
    'notes', vb.notes,
    'createdAt', vb.created_at
  ) INTO v_result
  FROM public.venue_bookings vb
  JOIN public.venues venue ON venue.id = vb.venue_id
  WHERE vb.tracking_code = v_code;

  RETURN v_result;
END;
$$;


--
-- Name: public_submit_booking_batch(uuid, text, uuid[], text, timestamp with time zone, timestamp with time zone, text, text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_booking_id uuid;
  v_tracking text;
  v_requested text[];
  v_other text := nullif(btrim(coalesce(p_other_equipment, '')), '');
BEGIN
  SELECT coalesce(array_agg(DISTINCT btrim(item) ORDER BY btrim(item)), ARRAY[]::text[])
    INTO v_requested
  FROM unnest(coalesce(p_requested_equipment, ARRAY[]::text[])) AS item
  WHERE nullif(btrim(item), '') IS NOT NULL;

  IF nullif(btrim(p_title), '') IS NULL OR char_length(btrim(p_title)) > 120
    OR nullif(btrim(p_booked_by), '') IS NULL OR char_length(btrim(p_booked_by)) > 200
    OR p_checked_out_at <= now()
    OR p_expected_return_at <= p_checked_out_at
    OR coalesce(array_length(v_requested, 1), 0) > 50
    OR EXISTS (SELECT 1 FROM unnest(v_requested) AS requested(item) WHERE char_length(item) > 120)
    OR char_length(coalesce(p_other_equipment, '')) > 1000
    OR char_length(coalesce(p_notes, '')) > 10000
    OR (coalesce(array_length(v_requested, 1), 0) = 0 AND v_other IS NULL)
  THEN
    RAISE EXCEPTION 'Enter valid booking details.' USING ERRCODE = 'check_violation';
  END IF;

  v_tracking := public.generate_tracking_code('BKG');
  INSERT INTO public.bookings (
    workspace_id, tracking_code, title, booked_by, checked_out_at,
    expected_return_at, notes, requested_equipment, other_equipment
  ) VALUES (
    p_workspace_id, v_tracking, btrim(p_title), btrim(p_booked_by), p_checked_out_at,
    p_expected_return_at, nullif(btrim(coalesce(p_notes, '')), ''), v_requested, v_other
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.booking_items (booking_id, equipment_id)
  SELECT v_booking_id, equipment_id
  FROM unnest(coalesce(p_equipment_ids, ARRAY[]::uuid[])) AS equipment_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'tracking_code', v_tracking,
    'title', btrim(p_title)
  );
END;
$$;


--
-- Name: public_submit_request(uuid, text, public.request_priority, text, timestamp with time zone, text, text, text, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text DEFAULT NULL::text, p_flow text DEFAULT NULL::text, p_content text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_request_id uuid;
  v_tracking text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.request_categories
    WHERE workspace_id = p_workspace_id AND key = p_category AND active
  ) THEN
    RAISE EXCEPTION 'Choose an available request category.' USING ERRCODE = 'check_violation';
  END IF;
  IF nullif(btrim(p_title), '') IS NULL OR char_length(btrim(p_title)) > 120
    OR nullif(btrim(p_requested_by), '') IS NULL OR char_length(btrim(p_requested_by)) > 200
    OR nullif(btrim(p_who), '') IS NULL OR char_length(p_who) > 4000
    OR nullif(btrim(p_what), '') IS NULL OR char_length(p_what) > 4000
    OR nullif(btrim(p_when_text), '') IS NULL OR char_length(p_when_text) > 4000
    OR nullif(btrim(p_where_text), '') IS NULL OR char_length(p_where_text) > 4000
    OR nullif(btrim(p_why), '') IS NULL OR char_length(p_why) > 4000
    OR nullif(btrim(p_how), '') IS NULL OR char_length(p_how) > 4000
    OR char_length(coalesce(p_notes, '')) > 10000
    OR char_length(coalesce(p_flow, '')) > 10000
  THEN
    RAISE EXCEPTION 'Enter valid request details.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.requests (
    workspace_id, title, priority, category, due_date, requested_by,
    who, what, when_text, where_text, why, how, notes, flow, content
  ) VALUES (
    p_workspace_id, btrim(p_title), p_priority, p_category, p_due_date, btrim(p_requested_by),
    btrim(p_who), btrim(p_what), btrim(p_when_text), btrim(p_where_text), btrim(p_why), btrim(p_how),
    nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_flow, '')), ''), p_content
  )
  RETURNING id, tracking_code INTO v_request_id, v_tracking;

  RETURN jsonb_build_object('id', v_request_id, 'tracking_code', v_tracking);
END;
$$;


--
-- Name: public_submit_venue_booking(uuid, uuid, text, timestamp with time zone[], uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid DEFAULT NULL::uuid, p_event_other text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_recurrence jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
DECLARE
  v_slots timestamptz[];
  v_count integer;
  v_zone text;
  v_local_date date;
  v_booking_id uuid;
  v_tracking text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_event_other text := nullif(btrim(coalesce(p_event_other, '')), '');
  v_title text;
  v_occurrence_count integer;
BEGIN
  IF nullif(btrim(p_requested_by), '') IS NULL OR char_length(btrim(p_requested_by)) > 200 THEN
    RAISE EXCEPTION 'Enter who is booking this venue.' USING ERRCODE = 'check_violation';
  END IF;
  IF (p_event_id IS NULL) = (v_event_other IS NULL) THEN
    RAISE EXCEPTION 'Choose an event, or describe it under “Other”.' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(coalesce(v_event_other, '')) > 120 THEN
    RAISE EXCEPTION 'Keep the event description to 120 characters or fewer.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT event.name INTO v_title FROM public.venue_events AS event
    WHERE event.id = p_event_id AND event.workspace_id = p_workspace_id AND event.active;
    IF v_title IS NULL THEN RAISE EXCEPTION 'That event is not available.' USING ERRCODE = 'check_violation'; END IF;
  ELSE
    v_title := v_event_other;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = p_venue_id AND workspace_id = p_workspace_id AND active) THEN
    RAISE EXCEPTION 'That venue is not available for booking.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT array_agg(DISTINCT slot ORDER BY slot) INTO v_slots
  FROM unnest(coalesce(p_slot_starts, ARRAY[]::timestamptz[])) AS slot;
  v_count := coalesce(array_length(v_slots, 1), 0);
  IF v_count = 0 OR v_count > 30 THEN RAISE EXCEPTION 'Choose at least one valid time slot.' USING ERRCODE = 'check_violation'; END IF;
  v_zone := public.workspace_timezone(p_workspace_id);
  v_local_date := (v_slots[1] AT TIME ZONE v_zone)::date;
  IF EXISTS (
    SELECT 1 FROM unnest(v_slots) AS slot
    WHERE NOT EXISTS (SELECT 1 FROM public.venue_slot_grid(p_workspace_id, v_local_date) AS grid WHERE grid.slot_start = slot)
  ) OR v_slots[v_count] <> v_slots[1] + make_interval(mins => 30 * (v_count - 1))
  THEN RAISE EXCEPTION 'Choose one continuous block within the bookable hours.' USING ERRCODE = 'check_violation'; END IF;
  IF v_slots[1] <= now() THEN RAISE EXCEPTION 'Choose a time in the future.' USING ERRCODE = 'check_violation'; END IF;

  DROP TABLE IF EXISTS pg_temp.recurrence_slots;
  CREATE TEMP TABLE recurrence_slots ON COMMIT DROP AS
  SELECT * FROM moc_private.expand_venue_booking_slots(p_workspace_id, v_slots, p_recurrence);
  IF EXISTS (
    SELECT 1 FROM recurrence_slots AS requested
    WHERE requested.slot_start <= now()
      OR NOT EXISTS (
        SELECT 1 FROM public.venue_slot_grid(p_workspace_id, (requested.slot_start AT TIME ZONE v_zone)::date) AS grid
        WHERE grid.slot_start = requested.slot_start
      )
  ) THEN RAISE EXCEPTION 'One or more repeated times are not bookable.' USING ERRCODE = 'check_violation'; END IF;

  SELECT min(slot_start), max(slot_end) FILTER (WHERE occurrence_index = 0), count(DISTINCT occurrence_index)
  INTO v_starts_at, v_ends_at, v_occurrence_count FROM recurrence_slots;
  v_tracking := public.generate_tracking_code('VEN');

  INSERT INTO public.venue_bookings (
    workspace_id, venue_id, event_id, event_other, tracking_code, title,
    requested_by, notes, starts_at, ends_at, recurrence
  ) VALUES (
    p_workspace_id, p_venue_id, p_event_id, v_event_other, v_tracking, v_title,
    btrim(p_requested_by), nullif(btrim(coalesce(p_notes, '')), ''), v_starts_at, v_ends_at, p_recurrence
  ) RETURNING id INTO v_booking_id;

  BEGIN
    INSERT INTO public.venue_booking_slots (venue_booking_id, venue_id, occurrence_index, slot_start, slot_end)
    SELECT v_booking_id, p_venue_id, occurrence_index, slot_start, slot_end FROM recurrence_slots;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'One or more repeated times have already been booked. Choose a different pattern or time.' USING ERRCODE = 'unique_violation';
  END;

  RETURN jsonb_build_object(
    'id', v_booking_id, 'tracking_code', v_tracking, 'title', v_title,
    'starts_at', v_starts_at, 'ends_at', v_ends_at, 'occurrence_count', v_occurrence_count
  );
END;
$$;


--
-- Name: public_venue_availability(uuid, date, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid DEFAULT NULL::uuid) RETURNS TABLE(venue_id uuid, venue_name text, slot_start timestamp with time zone, slot_end timestamp with time zone, available boolean, time_zone text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT
    venue.id,
    venue.name,
    grid.slot_start,
    grid.slot_end,
    (
      grid.slot_start > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.venue_booking_slots AS slot
        WHERE slot.venue_id = venue.id
          AND slot.slot_start = grid.slot_start
          AND slot.active
      )
    ) AS available,
    public.workspace_timezone(p_workspace_id) AS time_zone
  FROM public.venues AS venue
  CROSS JOIN public.venue_slot_grid(p_workspace_id, p_date) AS grid
  WHERE venue.workspace_id = p_workspace_id
    AND venue.active
    AND (p_venue_id IS NULL OR venue.id = p_venue_id)
  ORDER BY venue.sort_order, venue.name, grid.slot_start;
$$;


--
-- Name: purge_api_maintenance_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purge_api_maintenance_data() RETURNS TABLE(rate_limit_windows bigint, notification_ingest_replays bigint, telegram_webhook_updates bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_rate_limit_windows bigint;
  v_notification_ingest_replays bigint;
  v_telegram_webhook_updates bigint;
BEGIN
  DELETE FROM public.api_rate_limit_windows
  WHERE window_started_at < now() - interval '7 days';
  GET DIAGNOSTICS v_rate_limit_windows = ROW_COUNT;

  DELETE FROM public.notification_ingest_replays
  WHERE expires_at <= now();
  GET DIAGNOSTICS v_notification_ingest_replays = ROW_COUNT;

  DELETE FROM public.telegram_webhook_updates
  WHERE status IN ('processed', 'failed')
    AND coalesce(processed_at, received_at) < now() - interval '30 days';
  GET DIAGNOSTICS v_telegram_webhook_updates = ROW_COUNT;

  RETURN QUERY SELECT v_rate_limit_windows, v_notification_ingest_replays, v_telegram_webhook_updates;
END;
$$;


--
-- Name: record_request_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_request_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_event_type text;
  v_details    jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
    v_details := jsonb_build_object('requester_name', NEW.requested_by);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'status_changed';
    v_details := jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status);
  ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
    v_event_type := 'title_updated';
    v_details := jsonb_build_object('from_title', OLD.title, 'to_title', NEW.title);
  ELSE
    v_event_type := 'updated';
  END IF;

  INSERT INTO public.request_activity (request_id, actor_id, event_type, details)
  VALUES (NEW.id, moc_private.actor_id(), v_event_type, v_details);

  RETURN NEW;
END;
$$;


--
-- Name: recover_scheduled_deliveries(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recover_scheduled_deliveries() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$ BEGIN
 UPDATE scheduled_message_occurrences SET state='unknown',last_sync_error='Send interrupted; verify Telegram before reconciliation',delivery_lease=NULL,lease_until=NULL
  WHERE state='sending' AND lease_until<clock_timestamp();
 UPDATE notification_deliveries q SET status='failed',last_error='Send outcome unknown; automatic resend disabled' FROM scheduled_message_occurrences o WHERE q.scheduled_occurrence_id=o.id AND q.scheduled_operation IN ('send','resend') AND o.state='unknown' AND q.status IN ('pending','processing');
END $$;


--
-- Name: refresh_equipment_status_for(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
DECLARE
  v_current_status public.equipment_status;
  v_new_status     public.equipment_status;
BEGIN
  SELECT status INTO v_current_status
  FROM public.equipment
  WHERE id = p_equipment_id;

  IF v_current_status = 'maintenance' THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'checked_out'
  ) THEN
    v_new_status := 'booked_out';
  ELSIF EXISTS (
    SELECT 1
    FROM public.booking_items bi
    JOIN public.bookings b ON b.id = bi.booking_id
    WHERE bi.equipment_id = p_equipment_id
      AND b.status = 'booked'
  ) THEN
    v_new_status := 'booked';
  ELSE
    v_new_status := 'available';
  END IF;

  UPDATE public.equipment
  SET status = v_new_status
  WHERE id = p_equipment_id;
END;
$$;


--
-- Name: reject_workspace_join_request(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_workspace_join_request(p_request_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_request public.workspace_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.workspace_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending access request not found';
  END IF;

  IF NOT moc_private.current_user_can(v_request.workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.workspace_join_requests WHERE id = p_request_id;
  RETURN v_request.user_id;
END;
$$;


--
-- Name: release_integration_oauth_refresh_lock(text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_lock_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
  UPDATE moc_private.integration_oauth_tokens
  SET refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_lock_id = p_lock_id;
$$;


--
-- Name: replace_broadcast_playlist(uuid, uuid, timestamp with time zone, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.replace_broadcast_playlist(p_broadcast_id uuid, p_workspace_id uuid, p_expected_updated_at timestamp with time zone, p_title text, p_description text, p_items jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_item_count integer;
  v_kind public.broadcast_kind;
  v_updated_at timestamptz;
BEGIN
  IF moc_private.actor_id() IS NULL OR NOT moc_private.current_user_can(p_workspace_id, 'can_update') THEN
    RAISE EXCEPTION 'You do not have permission to update this broadcast' USING ERRCODE = '42501';
  END IF;

  SELECT broadcasts.kind, broadcasts.updated_at
  INTO v_kind, v_updated_at
  FROM public.broadcasts
  WHERE broadcasts.id = p_broadcast_id
    AND broadcasts.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'This broadcast changed after you opened it. Reload and try again.' USING ERRCODE = '40001';
  END IF;

  IF nullif(trim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Broadcast title is required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A broadcast needs at least one playlist item' USING ERRCODE = '22023';
  END IF;

  v_item_count := jsonb_array_length(p_items);

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(
      id uuid,
      title text,
      sort_order integer,
      storage_bucket text,
      storage_path text,
      public_url text,
      mime_type text,
      file_size_bytes bigint,
      duration_seconds numeric,
      created_at timestamptz
    )
    WHERE item.sort_order < 0
      OR item.sort_order >= v_item_count
      OR item.storage_bucket <> 'broadcast-media'
      OR item.storage_path NOT LIKE p_workspace_id::text || '/%'
      OR item.mime_type NOT LIKE v_kind::text || '/%'
      OR item.file_size_bytes < 0
      OR item.duration_seconds < 0
      OR (
        item.id IS NULL
        AND item.storage_path NOT LIKE p_workspace_id::text || '/' || moc_private.actor_id()::text || '/' || p_broadcast_id::text || '/%'
      )
      OR (
        item.id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.broadcast_items
          WHERE broadcast_items.id = item.id
            AND broadcast_items.broadcast_id = p_broadcast_id
            AND broadcast_items.title IS NOT DISTINCT FROM item.title
            AND broadcast_items.storage_bucket IS NOT DISTINCT FROM item.storage_bucket
            AND broadcast_items.storage_path IS NOT DISTINCT FROM item.storage_path
            AND broadcast_items.public_url IS NOT DISTINCT FROM item.public_url
            AND broadcast_items.mime_type IS NOT DISTINCT FROM item.mime_type
            AND broadcast_items.file_size_bytes IS NOT DISTINCT FROM item.file_size_bytes
            AND broadcast_items.duration_seconds IS NOT DISTINCT FROM item.duration_seconds
            AND broadcast_items.created_at IS NOT DISTINCT FROM item.created_at
        )
      )
  ) OR (
    SELECT count(DISTINCT item.sort_order)
    FROM jsonb_to_recordset(p_items) AS item(sort_order integer)
  ) <> v_item_count THEN
    RAISE EXCEPTION 'Broadcast playlist items are invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.broadcasts
  SET title = trim(p_title),
      description = coalesce(trim(p_description), '')
  WHERE id = p_broadcast_id;

  DELETE FROM public.broadcast_items
  WHERE broadcast_id = p_broadcast_id;

  INSERT INTO public.broadcast_items (
    id,
    broadcast_id,
    title,
    sort_order,
    storage_bucket,
    storage_path,
    public_url,
    mime_type,
    file_size_bytes,
    duration_seconds,
    created_at
  )
  SELECT
    coalesce(item.id, gen_random_uuid()),
    p_broadcast_id,
    item.title,
    item.sort_order,
    item.storage_bucket,
    item.storage_path,
    item.public_url,
    item.mime_type,
    item.file_size_bytes,
    item.duration_seconds,
    coalesce(item.created_at, now())
  FROM jsonb_to_recordset(p_items) AS item(
    id uuid,
    title text,
    sort_order integer,
    storage_bucket text,
    storage_path text,
    public_url text,
    mime_type text,
    file_size_bytes bigint,
    duration_seconds numeric,
    created_at timestamptz
  )
  ORDER BY item.sort_order;
END;
$$;


--
-- Name: request_scheduled_resend(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_scheduled_resend(p_actor uuid, p_id uuid, p_revision integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: request_scheduled_send(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_scheduled_send(p_actor uuid, p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
DECLARE o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p_id FOR UPDATE;
 IF NOT scheduled_actor_can(p_actor,o.workspace_id) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF o.expires_at<=clock_timestamp() OR o.state<>'scheduled' THEN RAISE EXCEPTION 'Message cannot be sent'; END IF;
 PERFORM queue_scheduled_message(o.id,'send');
 UPDATE notification_deliveries SET payload=jsonb_build_object('manual',true),next_attempt_at=clock_timestamp(),status=CASE WHEN status='failed' THEN 'pending' ELSE status END WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send';
END $$;


--
-- Name: reset_venue_booking_approval_on_reschedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_venue_booking_approval_on_reschedule() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'approved'
     AND (NEW.venue_id, NEW.starts_at, NEW.ends_at, NEW.recurrence)
       IS DISTINCT FROM (OLD.venue_id, OLD.starts_at, OLD.ends_at, OLD.recurrence) THEN
    NEW.status := 'auto';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: respond_scheduled_attendance(uuid, uuid, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.respond_scheduled_attendance(p_actor uuid, p_id uuid, p_revision integer, p_status text, p_arrival text DEFAULT NULL::text, p_group text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $_$
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
END $_$;


--
-- Name: save_checklist_structure(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_checklist_structure(p_checklist_id uuid, p_checklist jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.checklist_items
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.checklist_sections
  WHERE checklist_id = p_checklist_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.checklist_sections (id, checklist_id, name, sort_order)
  SELECT section.id, p_checklist_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, NULL, item.label, item.checked, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = NULL,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order)
  SELECT item.id, p_checklist_id, (section.value->>'id')::uuid, item.label, item.checked, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_id = EXCLUDED.checklist_id,
    section_id = EXCLUDED.section_id,
    label = EXCLUDED.label,
    checked = EXCLUDED.checked,
    sort_order = EXCLUDED.sort_order;
END;
$$;


--
-- Name: save_integration_oauth_connection(text, uuid, text, text, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_integration_oauth_connection(p_provider text, p_workspace_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone, p_connection jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
DECLARE
  v_connected_by uuid;
  v_channel_id text;
  v_channel_title text;
  v_zoom_user_id text;
  v_email text;
  v_display_name text;
  v_existing_zoom_user_id text;
  v_existing_channel_id text;
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR nullif(btrim(p_access_token), '') IS NULL
    OR nullif(btrim(p_refresh_token), '') IS NULL
    OR p_token_expires_at IS NULL
    OR jsonb_typeof(p_connection) <> 'object'
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth connection payload' USING ERRCODE = 'check_violation';
  END IF;

  v_connected_by := nullif(btrim(p_connection ->> 'connected_by'), '')::uuid;
  IF v_connected_by IS NULL THEN
    RAISE EXCEPTION 'A connection owner is required' USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_provider = 'youtube' THEN
    v_channel_id := nullif(btrim(p_connection ->> 'channel_id'), '');
    v_channel_title := nullif(btrim(p_connection ->> 'channel_title'), '');
    IF v_channel_id IS NULL OR v_channel_title IS NULL THEN
      RAISE EXCEPTION 'YouTube channel metadata is required' USING ERRCODE = 'not_null_violation';
    END IF;

    -- Preserve the existing YouTube write order.
    INSERT INTO moc_private.integration_oauth_tokens (
      provider, workspace_id, access_token, refresh_token, token_expires_at,
      refresh_lock_id, refresh_lock_expires_at
    ) VALUES (
      p_provider, p_workspace_id, p_access_token, p_refresh_token, p_token_expires_at,
      NULL, NULL
    )
    ON CONFLICT (provider, workspace_id) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        refresh_lock_id = NULL,
        refresh_lock_expires_at = NULL,
        updated_at = now();

    -- Locked after the moc_private tokens, which is the order the YouTube disconnect
    -- path already uses.
    SELECT channel_id INTO v_existing_channel_id
    FROM public.youtube_connections
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;

    IF v_existing_channel_id IS NOT NULL
      AND v_existing_channel_id IS DISTINCT FROM v_channel_id
    THEN
      -- The workspace has authorised a different channel, so its in-flight
      -- streams belong to a channel this connection can no longer read. Nothing
      -- can start, stop or reconcile them again, and the sync's deletion gate —
      -- "the moc_app channel is the channel we recorded" — would otherwise
      -- be comparing the new channel against itself and read every one of those
      -- rows as deleted on YouTube. That happens here, in the reconnect the user
      -- just performed, instead of unattended in the daily sweep.
      --
      -- Finished streams are kept: they are history, they are never looked up by
      -- the sync, and so they are never deletion candidates.
      UPDATE public.notification_outbox AS outbox_row
      SET status = 'failed',
          next_attempt_at = now(),
          last_error = 'Retired: the YouTube connection was repointed at another channel'
      WHERE outbox_row.workspace_id = p_workspace_id
        AND outbox_row.status IN ('pending', 'processing')
        AND outbox_row.entity_type = 'stream'
        AND outbox_row.entity_id IN (
          SELECT stream.id
          FROM public.streams AS stream
          WHERE stream.workspace_id = p_workspace_id
            AND stream.stream_status <> 'complete'
            AND stream.actual_end_time IS NULL
        );

      UPDATE public.notification_deliveries AS delivery
      SET status = 'failed',
          next_attempt_at = now(),
          last_error = 'Retired: the YouTube connection was repointed at another channel'
      WHERE delivery.status IN ('pending', 'processing')
        AND delivery.event_key IN (
          SELECT format('stream.created:%s', stream.id)
          FROM public.streams AS stream
          WHERE stream.workspace_id = p_workspace_id
            AND stream.stream_status <> 'complete'
            AND stream.actual_end_time IS NULL
        );

      DELETE FROM public.streams
      WHERE workspace_id = p_workspace_id
        AND stream_status <> 'complete'
        AND actual_end_time IS NULL;
    END IF;

    INSERT INTO public.youtube_connections (
      workspace_id, channel_id, channel_title, token_expires_at, status, connected_by
    ) VALUES (
      p_workspace_id, v_channel_id, v_channel_title, p_token_expires_at, 'active', v_connected_by
    )
    ON CONFLICT (workspace_id) DO UPDATE
    SET channel_id = EXCLUDED.channel_id,
        channel_title = EXCLUDED.channel_title,
        token_expires_at = EXCLUDED.token_expires_at,
        status = 'active',
        connected_by = EXCLUDED.connected_by;
    RETURN;
  END IF;

  v_zoom_user_id := nullif(btrim(p_connection ->> 'zoom_user_id'), '');
  v_email := nullif(btrim(p_connection ->> 'email'), '');
  v_display_name := nullif(btrim(p_connection ->> 'display_name'), '');
  IF v_zoom_user_id IS NULL OR v_email IS NULL OR v_display_name IS NULL THEN
    RAISE EXCEPTION 'Zoom account metadata is required' USING ERRCODE = 'not_null_violation';
  END IF;

  SELECT zoom_user_id INTO v_existing_zoom_user_id
  FROM public.zoom_connections
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_existing_zoom_user_id IS NOT NULL
    AND v_existing_zoom_user_id IS DISTINCT FROM v_zoom_user_id
  THEN
    DELETE FROM public.zoom_connections
    WHERE workspace_id = p_workspace_id;
  END IF;

  -- Zoom disconnect/deauthorization lock the public connection before moc_private
  -- tokens. Maintain that same order here to avoid a cross-table deadlock.
  INSERT INTO moc_private.integration_oauth_tokens (
    provider, workspace_id, access_token, refresh_token, token_expires_at,
    refresh_lock_id, refresh_lock_expires_at
  ) VALUES (
    p_provider, p_workspace_id, p_access_token, p_refresh_token, p_token_expires_at,
    NULL, NULL
  )
  ON CONFLICT (provider, workspace_id) DO UPDATE
  SET access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      refresh_lock_id = NULL,
      refresh_lock_expires_at = NULL,
      updated_at = now();

  INSERT INTO public.zoom_connections (
    workspace_id, zoom_user_id, email, display_name, token_expires_at, status, connected_by
  ) VALUES (
    p_workspace_id, v_zoom_user_id, v_email, v_display_name, p_token_expires_at, 'active', v_connected_by
  )
  ON CONFLICT (workspace_id) DO UPDATE
  SET zoom_user_id = EXCLUDED.zoom_user_id,
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      token_expires_at = EXCLUDED.token_expires_at,
      status = 'active',
      connected_by = EXCLUDED.connected_by;
END;
$$;


--
-- Name: save_scheduled_template(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_scheduled_template(p_actor uuid, p_workspace uuid, p_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'moc_private', 'pg_temp'
    AS $$
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


--
-- Name: save_template_checklist_structure(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_template_checklist_structure(p_checklist_template_id uuid, p_checklist jsonb) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
DECLARE
  v_incoming_section_ids uuid[];
  v_incoming_item_ids    uuid[];
BEGIN
  SELECT coalesce(array_agg((section.value->>'id')::uuid), '{}')
  INTO v_incoming_section_ids
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value);

  SELECT coalesce(
    array_agg((item.value->>'id')::uuid),
    '{}'
  )
  INTO v_incoming_item_ids
  FROM (
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(value)
    UNION ALL
    SELECT item.value
    FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(section.value->'items', '[]'::jsonb)) AS item(value)
  ) AS item(value);

  DELETE FROM public.template_items
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_item_ids);

  DELETE FROM public.template_sections
  WHERE checklist_template_id = p_checklist_template_id
    AND id <> ALL(v_incoming_section_ids);

  INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order)
  SELECT section.id, p_checklist_template_id, section.name, section.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(
    id uuid,
    name text,
    sort_order integer,
    items jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

  -- top-level items (no section)
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, NULL, item.label, item.sort_order
  FROM jsonb_to_recordset(coalesce(p_checklist->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = NULL,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

  -- items inside sections
  INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order)
  SELECT item.id, p_checklist_template_id, (section.value->>'id')::uuid, item.label, item.sort_order
  FROM jsonb_array_elements(coalesce(p_checklist->'sections', '[]'::jsonb)) AS section(value)
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(section.value->'items', '[]'::jsonb)) AS item(
    id uuid,
    label text,
    checked boolean,
    sort_order integer
  )
  ON CONFLICT (id) DO UPDATE SET
    checklist_template_id = EXCLUDED.checklist_template_id,
    template_section_id = EXCLUDED.template_section_id,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;
END;
$$;


--
-- Name: set_booking_tracking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_booking_tracking_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('BKG');
    v_attempts := v_attempts + 1;

    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique booking tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;


--
-- Name: set_request_tracking_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_request_tracking_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF new.tracking_code IS NOT NULL THEN
    RETURN new;
  END IF;

  LOOP
    v_code := public.generate_tracking_code('REQ');
    v_attempts := v_attempts + 1;

    IF NOT EXISTS (SELECT 1 FROM public.requests WHERE tracking_code = v_code) THEN
      new.tracking_code := v_code;
      RETURN new;
    END IF;

    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique request tracking code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;


--
-- Name: set_telegram_group_topics_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_telegram_group_topics_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: set_telegram_groups_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_telegram_groups_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF TG_TABLE_NAME IN ('requests', 'bookings')
    AND (to_jsonb(NEW) - 'updated_at') = (to_jsonb(OLD) - 'updated_at')
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: set_workspace_member_role(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_workspace_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF NOT moc_private.current_user_can(p_workspace_id, 'can_manage_roles') THEN
    RAISE EXCEPTION 'Insufficient workspace permission' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = p_role_id) THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  UPDATE public.workspace_users
  SET role_id = p_role_id
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace member not found';
  END IF;
END;
$$;


--
-- Name: set_workspace_member_type(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_workspace_member_type(p_workspace_id uuid, p_user_id uuid, p_type_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF NOT moc_private.current_user_can(p_workspace_id,'can_update') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workspace_member_types WHERE id=p_type_id AND workspace_id=p_workspace_id) THEN RAISE EXCEPTION 'Invalid member type'; END IF;
 UPDATE public.workspace_users SET member_type_id=p_type_id WHERE workspace_id=p_workspace_id AND user_id=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
END $$;


--
-- Name: stamp_booking_returned_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stamp_booking_returned_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
BEGIN
  IF new.status = 'returned'
     AND (old.status IS DISTINCT FROM 'returned')
     AND new.returned_at IS NULL
  THEN
    new.returned_at = now();
  END IF;

  RETURN new;
END;
$$;


--
-- Name: sync_equipment_status_from_booking(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_equipment_status_from_booking() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
DECLARE
  v_equipment_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND new.status IS NOT DISTINCT FROM old.status THEN
    RETURN new;
  END IF;

  FOR v_equipment_id IN
    SELECT equipment_id
    FROM public.booking_items
    WHERE booking_id = coalesce(new.id, old.id)
  LOOP
    PERFORM public.refresh_equipment_status_for(v_equipment_id);
  END LOOP;

  RETURN coalesce(new, old);
END;
$$;


--
-- Name: sync_equipment_status_from_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_equipment_status_from_item() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'moc_private', 'extensions'
    AS $$
BEGIN
  PERFORM public.refresh_equipment_status_for(coalesce(new.equipment_id, old.equipment_id));
  RETURN coalesce(new, old);
END;
$$;


--
-- Name: sync_venue_booking_slot_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_venue_booking_slot_active() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_active boolean := NEW.status NOT IN ('cancelled', 'rejected');
BEGIN
  UPDATE public.venue_booking_slots
  SET active = v_active
  WHERE venue_booking_id = NEW.id
    AND active <> v_active;
  RETURN NEW;
END;
$$;


--
-- Name: try_acquire_integration_oauth_refresh_lock(text, uuid, text, uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.try_acquire_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_lock_expires_at timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'moc_private'
    AS $$
BEGIN
  IF p_provider NOT IN ('youtube', 'zoom')
    OR p_lock_id IS NULL
    OR p_lock_expires_at IS NULL
    OR p_lock_expires_at <= now()
  THEN
    RAISE EXCEPTION 'Invalid integration OAuth refresh lock' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE moc_private.integration_oauth_tokens
  SET refresh_lock_id = p_lock_id,
      refresh_lock_expires_at = p_lock_expires_at,
      updated_at = now()
  WHERE provider = p_provider
    AND workspace_id = p_workspace_id
    AND refresh_token = p_expected_refresh_token
    AND (refresh_lock_expires_at IS NULL OR refresh_lock_expires_at <= now());
  RETURN FOUND;
END;
$$;


--
-- Name: venue_booking_phase(public.venue_booking_status, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT CASE
    WHEN p_status = 'cancelled'  THEN 'cancelled'
    WHEN p_status = 'rejected'   THEN 'rejected'
    WHEN now() >= p_ends_at      THEN 'completed'
    WHEN now() >= p_starts_at    THEN 'in_progress'
    WHEN p_status = 'approved'   THEN 'approved'
    ELSE 'booked'
  END;
$$;


--
-- Name: venue_slot_grid(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.venue_slot_grid(p_workspace_id uuid, p_date date) RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  WITH bounds AS (
    SELECT
      ((p_date + time '08:00') AT TIME ZONE zone.tz) AS day_start,
      ((p_date + time '23:00') AT TIME ZONE zone.tz) AS day_end
    FROM (SELECT public.workspace_timezone(p_workspace_id) AS tz) AS zone
  )
  SELECT step AS slot_start, step + interval '30 minutes' AS slot_end
  FROM bounds,
       generate_series(
         bounds.day_start,
         bounds.day_end - interval '30 minutes',
         interval '30 minutes'
       ) AS step;
$$;


--
-- Name: workspace_timezone(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.workspace_timezone(p_workspace_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  -- notification_settings.timezone is free text, and an unrecognised zone
  -- would make every availability read throw. Fall back instead.
  SELECT coalesce(
    (
      SELECT settings.timezone
      FROM public.notification_settings AS settings
      WHERE settings.workspace_id = p_workspace_id
        AND EXISTS (
          SELECT 1 FROM pg_catalog.pg_timezone_names AS zone
          WHERE zone.name = settings.timezone
        )
    ),
    'Africa/Harare'
  );
$$;


--
-- Name: integration_oauth_tokens; Type: TABLE; Schema: moc_private; Owner: -
--

CREATE TABLE moc_private.integration_oauth_tokens (
    provider text NOT NULL,
    workspace_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expires_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    refresh_lock_id uuid,
    refresh_lock_expires_at timestamp with time zone,
    CONSTRAINT integration_oauth_tokens_provider_check CHECK ((provider = ANY (ARRAY['youtube'::text, 'zoom'::text])))
);


--
-- Name: api_rate_limit_windows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_rate_limit_windows (
    policy text NOT NULL,
    subject_hash text NOT NULL,
    window_started_at timestamp with time zone NOT NULL,
    request_count integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_rate_limit_windows_policy_check CHECK ((policy = ANY (ARRAY['public_notification_wake'::text, 'signed_ingest'::text, 'oauth_mutation'::text, 'provider_proxy_read'::text, 'provider_proxy_write'::text, 'telegram_webhook'::text, 'telegram_mini_app'::text, 'authenticated_notification_mutation'::text, 'public_submission_lookup'::text, 'public_submission_mutation'::text]))),
    CONSTRAINT api_rate_limit_windows_request_count_check CHECK ((request_count >= 0)),
    CONSTRAINT api_rate_limit_windows_subject_hash_check CHECK ((subject_hash ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: booking_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    equipment_id uuid NOT NULL
);


--
-- Name: broadcast_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broadcast_id uuid NOT NULL,
    title text NOT NULL,
    sort_order integer NOT NULL,
    storage_bucket text DEFAULT 'broadcast-media'::text NOT NULL,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    mime_type text NOT NULL,
    file_size_bytes bigint NOT NULL,
    duration_seconds numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT broadcast_items_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds >= (0)::numeric))),
    CONSTRAINT broadcast_items_file_size_bytes_check CHECK ((file_size_bytes >= 0))
);

ALTER TABLE ONLY public.broadcast_items REPLICA IDENTITY FULL;


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    slug text NOT NULL,
    kind public.broadcast_kind NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.broadcasts REPLICA IDENTITY FULL;


--
-- Name: checklist_item_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_item_assignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_item_id uuid NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_id uuid NOT NULL,
    section_id uuid,
    label text NOT NULL,
    checked boolean DEFAULT false NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: checklist_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: checklist_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id uuid
);


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    serial_number text NOT NULL,
    category public.equipment_category NOT NULL,
    status public.equipment_status DEFAULT 'available'::public.equipment_status NOT NULL,
    location text NOT NULL,
    notes text,
    last_active_on date,
    thumbnail_url text
);


--
-- Name: notification_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    event_key text NOT NULL,
    event_type text,
    scope text NOT NULL,
    route_id uuid,
    recipient_user_id uuid,
    destination_key text NOT NULL,
    chat_id text NOT NULL,
    thread_id bigint,
    text text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    sent_at timestamp with time zone,
    telegram_message_id bigint,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reply_markup jsonb,
    entity_type text,
    entity_id uuid,
    parent_delivery_id uuid,
    telegram_deleted_at timestamp with time zone,
    scheduled_occurrence_id uuid,
    scheduled_operation text,
    CONSTRAINT notification_deliveries_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT notification_deliveries_scheduled_operation_check CHECK ((scheduled_operation = ANY (ARRAY['send'::text, 'resend'::text, 'edit'::text, 'expire'::text, 'delete'::text]))),
    CONSTRAINT notification_deliveries_scope_check CHECK ((scope = ANY (ARRAY['group'::text, 'dm'::text]))),
    CONSTRAINT notification_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: notification_ingest_replays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_ingest_replays (
    nonce text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_ingest_replays_nonce_check CHECK (((char_length(nonce) >= 1) AND (char_length(nonce) <= 256)))
);


--
-- Name: notification_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL,
    message_type text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    event_key text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error text,
    dispatched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_outbox_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT notification_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'dispatched'::text, 'failed'::text])))
);


--
-- Name: notification_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    event_type text NOT NULL,
    group_chat_id text,
    thread_id bigint,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    CONSTRAINT notification_routes_single_target CHECK ((((group_chat_id IS NOT NULL) AND (user_id IS NULL)) OR ((group_chat_id IS NULL) AND (user_id IS NOT NULL) AND (thread_id IS NULL))))
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    workspace_id uuid NOT NULL,
    auto_archive_completed_requests_days integer DEFAULT 7 NOT NULL,
    auto_archive_returned_bookings_days integer DEFAULT 7 NOT NULL,
    timezone text DEFAULT 'Africa/Harare'::text NOT NULL,
    date_format text DEFAULT 'day-month-time'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_settings_auto_archive_completed_requests_day_check CHECK ((auto_archive_completed_requests_days > 0)),
    CONSTRAINT notification_settings_auto_archive_returned_bookings_days_check CHECK ((auto_archive_returned_bookings_days > 0))
);


--
-- Name: request_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_activity_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'updated'::text, 'title_updated'::text, 'status_changed'::text])))
);


--
-- Name: request_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_assignees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    duty text NOT NULL
);


--
-- Name: request_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    CONSTRAINT request_categories_key_check CHECK (((char_length(btrim(key)) >= 1) AND (char_length(btrim(key)) <= 120))),
    CONSTRAINT request_categories_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 120)))
);


--
-- Name: request_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    actor_id uuid DEFAULT moc_private.actor_id() NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT request_comments_body_check CHECK ((length(TRIM(BOTH FROM body)) > 0))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_read boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    can_manage_roles boolean DEFAULT false NOT NULL
);


--
-- Name: scheduled_message_occurrences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    schedule_id uuid NOT NULL,
    occurrence_on date NOT NULL,
    send_on timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    fields jsonb NOT NULL,
    body text NOT NULL,
    message_type text NOT NULL,
    audience uuid[] NOT NULL,
    require_arrival boolean NOT NULL,
    state text DEFAULT 'scheduled'::text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    synced_revision integer DEFAULT 0 NOT NULL,
    telegram_message_id bigint,
    roster_frozen boolean DEFAULT false NOT NULL,
    last_sync_error text,
    delivery_lease uuid,
    lease_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attendance_groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT scheduled_message_occurrences_state_check CHECK ((state = ANY (ARRAY['scheduled'::text, 'sending'::text, 'sent'::text, 'unknown'::text, 'cancelled'::text])))
);


--
-- Name: scheduled_message_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_responses (
    occurrence_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'awaiting'::text NOT NULL,
    arrival_time text,
    acknowledged_revision integer DEFAULT 0 NOT NULL,
    group_id text,
    CONSTRAINT scheduled_message_responses_arrival_time_check CHECK (((arrival_time IS NULL) OR (arrival_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text))),
    CONSTRAINT scheduled_message_responses_status_check CHECK ((status = ANY (ARRAY['awaiting'::text, 'attending'::text, 'not_attending'::text])))
);


--
-- Name: scheduled_message_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    template_id uuid NOT NULL,
    group_chat_id text NOT NULL,
    thread_id bigint,
    starts_on date NOT NULL,
    until_on date,
    timezone text DEFAULT 'Africa/Johannesburg'::text NOT NULL,
    frequency text NOT NULL,
    auto_send boolean DEFAULT true NOT NULL,
    expiry_hours numeric DEFAULT 72 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    fields jsonb NOT NULL,
    body text NOT NULL,
    message_type text NOT NULL,
    audience uuid[] NOT NULL,
    require_arrival boolean NOT NULL,
    attendance_groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    send_time time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    CONSTRAINT scheduled_message_schedules_check CHECK (((until_on IS NULL) OR (until_on >= starts_on))),
    CONSTRAINT scheduled_message_schedules_expiry_hours_check CHECK (((expiry_hours >= (1.0 / (60)::numeric)) AND (expiry_hours <= (8760)::numeric))),
    CONSTRAINT scheduled_message_schedules_frequency_check CHECK ((frequency = ANY (ARRAY['once'::text, 'daily'::text, 'weekdays'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: scheduled_message_series_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_series_changes (
    id bigint NOT NULL,
    schedule_id uuid NOT NULL,
    effective_on date NOT NULL,
    field text NOT NULL,
    value text NOT NULL
);


--
-- Name: scheduled_message_series_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_series_changes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scheduled_message_series_changes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scheduled_message_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    telegram_user_id text NOT NULL,
    workspace_id uuid NOT NULL,
    chat_id text NOT NULL,
    thread_id bigint,
    ephemeral_message_id bigint,
    occurrence_id uuid,
    kind text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    CONSTRAINT scheduled_message_sessions_kind_check CHECK ((kind = ANY (ARRAY['admin'::text, 'attendance'::text])))
);


--
-- Name: scheduled_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    message_type text NOT NULL,
    body text NOT NULL,
    fields jsonb NOT NULL,
    audience uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    require_arrival boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    attendance_groups jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT scheduled_message_templates_body_check CHECK (((length(body) >= 1) AND (length(body) <= 3000))),
    CONSTRAINT scheduled_message_templates_fields_check CHECK ((jsonb_typeof(fields) = 'object'::text)),
    CONSTRAINT scheduled_message_templates_message_type_check CHECK ((message_type = ANY (ARRAY['announcement'::text, 'pre_attendance'::text]))),
    CONSTRAINT scheduled_message_templates_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80)))
);


--
-- Name: streams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    youtube_broadcast_id text NOT NULL,
    youtube_stream_id text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    thumbnail_url text,
    privacy_status text DEFAULT 'unlisted'::text NOT NULL,
    is_for_kids boolean DEFAULT false NOT NULL,
    scheduled_start_time timestamp with time zone,
    actual_start_time timestamp with time zone,
    actual_end_time timestamp with time zone,
    stream_status public.stream_status DEFAULT 'created'::public.stream_status NOT NULL,
    stream_url text,
    stream_key text,
    ingestion_url text,
    category_id text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    latency_preference text DEFAULT 'normal'::text NOT NULL,
    enable_dvr boolean DEFAULT true NOT NULL,
    enable_embed boolean DEFAULT true NOT NULL,
    enable_auto_start boolean DEFAULT false NOT NULL,
    enable_auto_stop boolean DEFAULT true NOT NULL,
    playlist_id text,
    notified_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_group_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_group_topics (
    group_chat_id text NOT NULL,
    thread_id bigint NOT NULL,
    name text NOT NULL,
    closed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_groups (
    chat_id text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    is_forum boolean DEFAULT false NOT NULL,
    active boolean DEFAULT false NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid NOT NULL
);


--
-- Name: telegram_link_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_link_tokens (
    token text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL
);


--
-- Name: telegram_webhook_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_webhook_updates (
    update_id bigint NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processing_started_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    last_error text,
    CONSTRAINT telegram_webhook_updates_attempts_check CHECK ((attempts > 0)),
    CONSTRAINT telegram_webhook_updates_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text, 'failed'::text])))
);


--
-- Name: template_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_template_id uuid NOT NULL,
    template_section_id uuid,
    label text NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: template_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checklist_template_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    surname text NOT NULL,
    email text NOT NULL,
    telegram_chat_id text,
    avatar_url text,
    current_duty text,
    status_message text
);


--
-- Name: venue_booking_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_booking_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_booking_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    slot_start timestamp with time zone NOT NULL,
    slot_end timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    occurrence_index integer DEFAULT 0 NOT NULL,
    CONSTRAINT venue_booking_slots_occurrence_index_check CHECK ((occurrence_index >= 0)),
    CONSTRAINT venue_booking_slots_span_check CHECK ((slot_end > slot_start))
);


--
-- Name: venue_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    venue_id uuid NOT NULL,
    tracking_code text NOT NULL,
    title text NOT NULL,
    requested_by text NOT NULL,
    notes text,
    status public.venue_booking_status DEFAULT 'auto'::public.venue_booking_status NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    event_id uuid,
    event_other text,
    recurrence jsonb,
    approved_at timestamp with time zone,
    approved_by uuid,
    rejected_at timestamp with time zone,
    rejected_by uuid,
    CONSTRAINT venue_bookings_approved_check CHECK (((status = 'approved'::public.venue_booking_status) = (approved_at IS NOT NULL))),
    CONSTRAINT venue_bookings_cancelled_check CHECK (((status = 'cancelled'::public.venue_booking_status) = (cancelled_at IS NOT NULL))),
    CONSTRAINT venue_bookings_event_choice_check CHECK (((event_id IS NULL) OR (event_other IS NULL))),
    CONSTRAINT venue_bookings_rejected_check CHECK (((status = 'rejected'::public.venue_booking_status) = (rejected_at IS NOT NULL))),
    CONSTRAINT venue_bookings_requested_by_check CHECK ((char_length(btrim(requested_by)) > 0)),
    CONSTRAINT venue_bookings_span_check CHECK ((ends_at > starts_at)),
    CONSTRAINT venue_bookings_title_check CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 120)))
);


--
-- Name: venue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT venue_events_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 120)))
);


--
-- Name: venues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT venues_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 120)))
);


--
-- Name: workspace_join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_member_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_member_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    CONSTRAINT workspace_member_types_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 80)))
);


--
-- Name: workspace_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role_id uuid NOT NULL,
    member_type_id uuid NOT NULL
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: youtube_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.youtube_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    channel_id text NOT NULL,
    channel_title text NOT NULL,
    presets jsonb,
    token_expires_at timestamp with time zone NOT NULL,
    status public.youtube_connection_status DEFAULT 'active'::public.youtube_connection_status NOT NULL,
    connected_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zoom_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zoom_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    zoom_user_id text NOT NULL,
    email text NOT NULL,
    display_name text NOT NULL,
    token_expires_at timestamp with time zone NOT NULL,
    connected_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.youtube_connection_status DEFAULT 'active'::public.youtube_connection_status NOT NULL
);


--
-- Name: zoom_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zoom_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    zoom_connection_id uuid NOT NULL,
    zoom_meeting_id bigint NOT NULL,
    topic text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    meeting_type public.zoom_meeting_type DEFAULT 'scheduled'::public.zoom_meeting_type NOT NULL,
    start_time timestamp with time zone,
    duration integer DEFAULT 60 NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    join_url text,
    password text,
    recurrence_type public.zoom_recurrence_type DEFAULT 'none'::public.zoom_recurrence_type NOT NULL,
    recurrence_interval integer,
    recurrence_days text,
    waiting_room boolean DEFAULT true NOT NULL,
    mute_on_entry boolean DEFAULT true NOT NULL,
    continuous_chat boolean DEFAULT false NOT NULL,
    notified_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_oauth_tokens integration_oauth_tokens_pkey; Type: CONSTRAINT; Schema: moc_private; Owner: -
--

ALTER TABLE ONLY moc_private.integration_oauth_tokens
    ADD CONSTRAINT integration_oauth_tokens_pkey PRIMARY KEY (provider, workspace_id);


--
-- Name: api_rate_limit_windows api_rate_limit_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_rate_limit_windows
    ADD CONSTRAINT api_rate_limit_windows_pkey PRIMARY KEY (policy, subject_hash, window_started_at);


--
-- Name: booking_items booking_items_booking_id_equipment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_booking_id_equipment_id_key UNIQUE (booking_id, equipment_id);


--
-- Name: booking_items booking_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_tracking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tracking_code_key UNIQUE (tracking_code);


--
-- Name: broadcast_items broadcast_items_broadcast_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_items
    ADD CONSTRAINT broadcast_items_broadcast_id_sort_order_key UNIQUE (broadcast_id, sort_order);


--
-- Name: broadcast_items broadcast_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_items
    ADD CONSTRAINT broadcast_items_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_slug_key UNIQUE (slug);


--
-- Name: checklist_item_assignees checklist_item_assignees_checklist_item_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_item_assignees
    ADD CONSTRAINT checklist_item_assignees_checklist_item_id_user_id_key UNIQUE (checklist_item_id, user_id);


--
-- Name: checklist_item_assignees checklist_item_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_item_assignees
    ADD CONSTRAINT checklist_item_assignees_pkey PRIMARY KEY (id);


--
-- Name: checklist_items checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_pkey PRIMARY KEY (id);


--
-- Name: checklist_sections checklist_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_sections
    ADD CONSTRAINT checklist_sections_pkey PRIMARY KEY (id);


--
-- Name: checklist_templates checklist_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_serial_number_key UNIQUE (serial_number);


--
-- Name: notification_deliveries notification_deliveries_event_key_destination_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_event_key_destination_key_key UNIQUE (event_key, destination_key);


--
-- Name: notification_deliveries notification_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);


--
-- Name: notification_ingest_replays notification_ingest_replays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_ingest_replays
    ADD CONSTRAINT notification_ingest_replays_pkey PRIMARY KEY (nonce);


--
-- Name: notification_message_templates notification_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_message_templates
    ADD CONSTRAINT notification_message_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_outbox notification_outbox_event_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_event_key_key UNIQUE (event_key);


--
-- Name: notification_outbox notification_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (id);


--
-- Name: notification_routes notification_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_routes
    ADD CONSTRAINT notification_routes_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (workspace_id);


--
-- Name: request_activity request_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_activity
    ADD CONSTRAINT request_activity_pkey PRIMARY KEY (id);


--
-- Name: request_assignees request_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_assignees
    ADD CONSTRAINT request_assignees_pkey PRIMARY KEY (id);


--
-- Name: request_assignees request_assignees_request_id_user_id_duty_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_assignees
    ADD CONSTRAINT request_assignees_request_id_user_id_duty_key UNIQUE (request_id, user_id, duty);


--
-- Name: request_categories request_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_categories
    ADD CONSTRAINT request_categories_pkey PRIMARY KEY (id);


--
-- Name: request_categories request_categories_workspace_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_categories
    ADD CONSTRAINT request_categories_workspace_key_key UNIQUE (workspace_id, key);


--
-- Name: request_comments request_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: requests requests_tracking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_tracking_code_key UNIQUE (tracking_code);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_occurrences scheduled_message_occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_occurrences
    ADD CONSTRAINT scheduled_message_occurrences_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_occurrences scheduled_message_occurrences_schedule_id_occurrence_on_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_occurrences
    ADD CONSTRAINT scheduled_message_occurrences_schedule_id_occurrence_on_key UNIQUE (schedule_id, occurrence_on);


--
-- Name: scheduled_message_responses scheduled_message_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_responses
    ADD CONSTRAINT scheduled_message_responses_pkey PRIMARY KEY (occurrence_id, user_id);


--
-- Name: scheduled_message_schedules scheduled_message_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_schedules
    ADD CONSTRAINT scheduled_message_schedules_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_schedules scheduled_message_schedules_workspace_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_schedules
    ADD CONSTRAINT scheduled_message_schedules_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: scheduled_message_series_changes scheduled_message_series_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_series_changes
    ADD CONSTRAINT scheduled_message_series_changes_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_sessions scheduled_message_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_sessions
    ADD CONSTRAINT scheduled_message_sessions_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_sessions scheduled_message_sessions_telegram_user_id_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_sessions
    ADD CONSTRAINT scheduled_message_sessions_telegram_user_id_chat_id_key UNIQUE (telegram_user_id, chat_id);


--
-- Name: scheduled_message_templates scheduled_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_templates
    ADD CONSTRAINT scheduled_message_templates_pkey PRIMARY KEY (id);


--
-- Name: scheduled_message_templates scheduled_message_templates_workspace_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_templates
    ADD CONSTRAINT scheduled_message_templates_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: streams streams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);


--
-- Name: streams streams_workspace_id_youtube_broadcast_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_workspace_id_youtube_broadcast_id_key UNIQUE (workspace_id, youtube_broadcast_id);


--
-- Name: telegram_group_topics telegram_group_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_group_topics
    ADD CONSTRAINT telegram_group_topics_pkey PRIMARY KEY (group_chat_id, thread_id);


--
-- Name: telegram_groups telegram_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_groups
    ADD CONSTRAINT telegram_groups_pkey PRIMARY KEY (chat_id);


--
-- Name: telegram_link_tokens telegram_link_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_pkey PRIMARY KEY (token);


--
-- Name: telegram_webhook_updates telegram_webhook_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_webhook_updates
    ADD CONSTRAINT telegram_webhook_updates_pkey PRIMARY KEY (update_id);


--
-- Name: template_items template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);


--
-- Name: template_sections template_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_sections
    ADD CONSTRAINT template_sections_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: venue_booking_slots venue_booking_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_booking_slots
    ADD CONSTRAINT venue_booking_slots_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_pkey PRIMARY KEY (id);


--
-- Name: venue_bookings venue_bookings_tracking_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_tracking_code_key UNIQUE (tracking_code);


--
-- Name: venue_events venue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_events
    ADD CONSTRAINT venue_events_pkey PRIMARY KEY (id);


--
-- Name: venues venues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_pkey PRIMARY KEY (id);


--
-- Name: workspace_join_requests workspace_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_join_requests
    ADD CONSTRAINT workspace_join_requests_pkey PRIMARY KEY (id);


--
-- Name: workspace_join_requests workspace_join_requests_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_join_requests
    ADD CONSTRAINT workspace_join_requests_workspace_id_user_id_key UNIQUE (workspace_id, user_id);


--
-- Name: workspace_member_types workspace_member_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_member_types
    ADD CONSTRAINT workspace_member_types_pkey PRIMARY KEY (id);


--
-- Name: workspace_member_types workspace_member_types_workspace_id_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_member_types
    ADD CONSTRAINT workspace_member_types_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: workspace_users workspace_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_pkey PRIMARY KEY (id);


--
-- Name: workspace_users workspace_users_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_workspace_id_user_id_key UNIQUE (workspace_id, user_id);


--
-- Name: workspaces workspaces_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_name_key UNIQUE (name);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


--
-- Name: youtube_connections youtube_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_connections
    ADD CONSTRAINT youtube_connections_pkey PRIMARY KEY (id);


--
-- Name: youtube_connections youtube_connections_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_connections
    ADD CONSTRAINT youtube_connections_workspace_id_key UNIQUE (workspace_id);


--
-- Name: zoom_connections zoom_connections_id_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_connections
    ADD CONSTRAINT zoom_connections_id_workspace_id_key UNIQUE (id, workspace_id);


--
-- Name: zoom_connections zoom_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_connections
    ADD CONSTRAINT zoom_connections_pkey PRIMARY KEY (id);


--
-- Name: zoom_connections zoom_connections_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_connections
    ADD CONSTRAINT zoom_connections_workspace_id_key UNIQUE (workspace_id);


--
-- Name: zoom_meetings zoom_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_meetings
    ADD CONSTRAINT zoom_meetings_pkey PRIMARY KEY (id);


--
-- Name: zoom_meetings zoom_meetings_workspace_id_zoom_meeting_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_meetings
    ADD CONSTRAINT zoom_meetings_workspace_id_zoom_meeting_id_key UNIQUE (workspace_id, zoom_meeting_id);


--
-- Name: idx_integration_oauth_tokens_workspace_id; Type: INDEX; Schema: moc_private; Owner: -
--

CREATE INDEX idx_integration_oauth_tokens_workspace_id ON moc_private.integration_oauth_tokens USING btree (workspace_id);


--
-- Name: idx_api_rate_limit_windows_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_rate_limit_windows_expiry ON public.api_rate_limit_windows USING btree (window_started_at);


--
-- Name: idx_booking_items_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_items_booking_id ON public.booking_items USING btree (booking_id);


--
-- Name: idx_booking_items_equipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_items_equipment_id ON public.booking_items USING btree (equipment_id);


--
-- Name: idx_bookings_expected_return; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_expected_return ON public.bookings USING btree (expected_return_at) WHERE (returned_at IS NULL);


--
-- Name: idx_bookings_tracking_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_tracking_code ON public.bookings USING btree (tracking_code);


--
-- Name: idx_bookings_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_updated_at ON public.bookings USING btree (updated_at);


--
-- Name: idx_bookings_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_workspace_id ON public.bookings USING btree (workspace_id);


--
-- Name: idx_broadcast_items_broadcast_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcast_items_broadcast_id_sort_order ON public.broadcast_items USING btree (broadcast_id, sort_order);


--
-- Name: idx_broadcasts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_created_by ON public.broadcasts USING btree (created_by);


--
-- Name: idx_broadcasts_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_workspace_id ON public.broadcasts USING btree (workspace_id);


--
-- Name: idx_broadcasts_workspace_id_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcasts_workspace_id_kind ON public.broadcasts USING btree (workspace_id, kind);


--
-- Name: idx_checklist_item_assignees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_item_assignees_user_id ON public.checklist_item_assignees USING btree (user_id);


--
-- Name: idx_checklist_items_checklist_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_items_checklist_id_sort_order ON public.checklist_items USING btree (checklist_id, sort_order);


--
-- Name: idx_checklist_items_section_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_items_section_id_sort_order ON public.checklist_items USING btree (section_id, sort_order);


--
-- Name: idx_checklist_sections_checklist_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_sections_checklist_id_sort_order ON public.checklist_sections USING btree (checklist_id, sort_order);


--
-- Name: idx_checklist_templates_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_templates_workspace_id ON public.checklist_templates USING btree (workspace_id);


--
-- Name: idx_checklists_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_request_id ON public.checklists USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_checklists_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_workspace_id ON public.checklists USING btree (workspace_id);


--
-- Name: idx_equipment_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_workspace_id ON public.equipment USING btree (workspace_id);


--
-- Name: idx_notification_deliveries_recipient_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deliveries_recipient_user_id ON public.notification_deliveries USING btree (recipient_user_id) WHERE (recipient_user_id IS NOT NULL);


--
-- Name: idx_notification_deliveries_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_deliveries_route_id ON public.notification_deliveries USING btree (route_id) WHERE (route_id IS NOT NULL);


--
-- Name: idx_notification_ingest_replays_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_ingest_replays_expires_at ON public.notification_ingest_replays USING btree (expires_at);


--
-- Name: idx_notification_outbox_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_outbox_workspace_id ON public.notification_outbox USING btree (workspace_id);


--
-- Name: idx_notification_routes_group_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_routes_group_chat_id ON public.notification_routes USING btree (group_chat_id);


--
-- Name: idx_notification_routes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_routes_user_id ON public.notification_routes USING btree (user_id);


--
-- Name: idx_request_activity_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_activity_actor_id ON public.request_activity USING btree (actor_id) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_request_activity_request_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_activity_request_created_at ON public.request_activity USING btree (request_id, created_at DESC);


--
-- Name: idx_request_assignees_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_assignees_request_id ON public.request_assignees USING btree (request_id);


--
-- Name: idx_request_assignees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_assignees_user_id ON public.request_assignees USING btree (user_id);


--
-- Name: idx_request_categories_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_categories_workspace_id ON public.request_categories USING btree (workspace_id);


--
-- Name: idx_request_comments_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_comments_actor_id ON public.request_comments USING btree (actor_id);


--
-- Name: idx_request_comments_request_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_comments_request_created_at ON public.request_comments USING btree (request_id, created_at DESC);


--
-- Name: idx_requests_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_updated_at ON public.requests USING btree (updated_at);


--
-- Name: idx_requests_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_workspace_id ON public.requests USING btree (workspace_id);


--
-- Name: idx_streams_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_created_by ON public.streams USING btree (created_by);


--
-- Name: idx_streams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_status ON public.streams USING btree (stream_status);


--
-- Name: idx_streams_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_workspace_id ON public.streams USING btree (workspace_id);


--
-- Name: idx_telegram_webhook_updates_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_webhook_updates_retry ON public.telegram_webhook_updates USING btree (processing_started_at) WHERE (status = ANY (ARRAY['processing'::text, 'failed'::text]));


--
-- Name: idx_template_items_checklist_template_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_items_checklist_template_id_sort_order ON public.template_items USING btree (checklist_template_id, sort_order);


--
-- Name: idx_template_items_template_section_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_items_template_section_id_sort_order ON public.template_items USING btree (template_section_id, sort_order);


--
-- Name: idx_template_sections_checklist_template_id_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_sections_checklist_template_id_sort_order ON public.template_sections USING btree (checklist_template_id, sort_order);


--
-- Name: idx_venue_booking_slots_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_booking_slots_booking_id ON public.venue_booking_slots USING btree (venue_booking_id);


--
-- Name: idx_venue_booking_slots_booking_occurrence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_booking_slots_booking_occurrence ON public.venue_booking_slots USING btree (venue_booking_id, occurrence_index, slot_start);


--
-- Name: idx_venue_bookings_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_approved_by ON public.venue_bookings USING btree (approved_by);


--
-- Name: idx_venue_bookings_cancelled_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_cancelled_by ON public.venue_bookings USING btree (cancelled_by);


--
-- Name: idx_venue_bookings_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_event_id ON public.venue_bookings USING btree (event_id);


--
-- Name: idx_venue_bookings_rejected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_rejected_by ON public.venue_bookings USING btree (rejected_by);


--
-- Name: idx_venue_bookings_venue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_venue_id ON public.venue_bookings USING btree (venue_id);


--
-- Name: idx_venue_bookings_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_workspace_id ON public.venue_bookings USING btree (workspace_id);


--
-- Name: idx_venue_bookings_workspace_starts_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_bookings_workspace_starts_at ON public.venue_bookings USING btree (workspace_id, starts_at DESC);


--
-- Name: idx_venue_events_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venue_events_workspace_id ON public.venue_events USING btree (workspace_id);


--
-- Name: idx_venues_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_venues_workspace_id ON public.venues USING btree (workspace_id);


--
-- Name: idx_workspace_join_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_join_requests_user_id ON public.workspace_join_requests USING btree (user_id);


--
-- Name: idx_workspace_join_requests_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_join_requests_workspace_id ON public.workspace_join_requests USING btree (workspace_id, requested_at);


--
-- Name: idx_workspace_users_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_users_role_id ON public.workspace_users USING btree (role_id);


--
-- Name: idx_workspace_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_users_user_id ON public.workspace_users USING btree (user_id);


--
-- Name: idx_workspace_users_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_users_workspace_id ON public.workspace_users USING btree (workspace_id);


--
-- Name: idx_youtube_connections_connected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_connections_connected_by ON public.youtube_connections USING btree (connected_by);


--
-- Name: idx_youtube_connections_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_youtube_connections_workspace_id ON public.youtube_connections USING btree (workspace_id);


--
-- Name: idx_zoom_connections_connected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_connections_connected_by ON public.zoom_connections USING btree (connected_by);


--
-- Name: idx_zoom_connections_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_connections_workspace_id ON public.zoom_connections USING btree (workspace_id);


--
-- Name: idx_zoom_meetings_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_meetings_created_by ON public.zoom_meetings USING btree (created_by);


--
-- Name: idx_zoom_meetings_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_meetings_start_time ON public.zoom_meetings USING btree (start_time);


--
-- Name: idx_zoom_meetings_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_meetings_workspace_id ON public.zoom_meetings USING btree (workspace_id);


--
-- Name: idx_zoom_meetings_zoom_connection_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zoom_meetings_zoom_connection_workspace_id ON public.zoom_meetings USING btree (zoom_connection_id, workspace_id);


--
-- Name: notification_deliveries_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_entity_idx ON public.notification_deliveries USING btree (entity_type, entity_id) WHERE (entity_id IS NOT NULL);


--
-- Name: notification_deliveries_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_parent_idx ON public.notification_deliveries USING btree (parent_delivery_id) WHERE (parent_delivery_id IS NOT NULL);


--
-- Name: notification_deliveries_ready_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_ready_idx ON public.notification_deliveries USING btree (next_attempt_at, created_at) WHERE (status = 'pending'::text);


--
-- Name: notification_deliveries_telegram_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_telegram_message_idx ON public.notification_deliveries USING btree (chat_id, telegram_message_id) WHERE (telegram_message_id IS NOT NULL);


--
-- Name: notification_deliveries_workspace_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_workspace_created_idx ON public.notification_deliveries USING btree (workspace_id, created_at DESC);


--
-- Name: notification_message_templates_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_message_templates_unique ON public.notification_message_templates USING btree (workspace_id, scope, message_type);


--
-- Name: notification_outbox_ready_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_outbox_ready_idx ON public.notification_outbox USING btree (next_attempt_at, created_at) WHERE (status = 'pending'::text);


--
-- Name: notification_routes_group_target_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_routes_group_target_key ON public.notification_routes USING btree (workspace_id, event_type, group_chat_id, COALESCE(thread_id, ('-1'::integer)::bigint)) WHERE (group_chat_id IS NOT NULL);


--
-- Name: notification_routes_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_routes_lookup_idx ON public.notification_routes USING btree (workspace_id, event_type) WHERE (enabled = true);


--
-- Name: notification_routes_unique_no_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_routes_unique_no_topic ON public.notification_routes USING btree (workspace_id, event_type, group_chat_id) WHERE (thread_id IS NULL);


--
-- Name: notification_routes_unique_with_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_routes_unique_with_topic ON public.notification_routes USING btree (workspace_id, event_type, group_chat_id, thread_id) WHERE (thread_id IS NOT NULL);


--
-- Name: notification_routes_user_target_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_routes_user_target_key ON public.notification_routes USING btree (workspace_id, event_type, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: request_categories_workspace_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX request_categories_workspace_name_key ON public.request_categories USING btree (workspace_id, lower(btrim(name)));


--
-- Name: scheduled_occurrences_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_occurrences_active ON public.scheduled_message_occurrences USING btree (workspace_id, expires_at, send_on);


--
-- Name: scheduled_occurrences_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scheduled_occurrences_due ON public.scheduled_message_occurrences USING btree (send_on) WHERE (state = 'scheduled'::text);


--
-- Name: telegram_group_topics_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telegram_group_topics_group_idx ON public.telegram_group_topics USING btree (group_chat_id);


--
-- Name: telegram_groups_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telegram_groups_active_idx ON public.telegram_groups USING btree (active) WHERE (removed_at IS NULL);


--
-- Name: telegram_groups_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telegram_groups_workspace_id_idx ON public.telegram_groups USING btree (workspace_id);


--
-- Name: telegram_link_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telegram_link_tokens_expires_at_idx ON public.telegram_link_tokens USING btree (expires_at);


--
-- Name: telegram_link_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telegram_link_tokens_user_id_idx ON public.telegram_link_tokens USING btree (user_id);


--
-- Name: venue_booking_slots_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX venue_booking_slots_active_key ON public.venue_booking_slots USING btree (venue_id, slot_start) WHERE active;


--
-- Name: venue_events_workspace_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX venue_events_workspace_name_key ON public.venue_events USING btree (workspace_id, lower(btrim(name)));


--
-- Name: venues_workspace_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX venues_workspace_name_key ON public.venues USING btree (workspace_id, lower(btrim(name)));


--
-- Name: workspace_member_types_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_member_types_default ON public.workspace_member_types USING btree (workspace_id) WHERE is_default;


--
-- Name: workspace_member_types_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspace_member_types_name ON public.workspace_member_types USING btree (workspace_id, lower(btrim(name)));


--
-- Name: booking_items booking_items_enforce_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER booking_items_enforce_workspace BEFORE INSERT OR UPDATE OF booking_id, equipment_id ON public.booking_items FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_item_workspace();


--
-- Name: bookings bookings_enqueue_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bookings_enqueue_notification AFTER INSERT OR UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enqueue_booking_notification();


--
-- Name: checklist_item_assignees checklist_item_assignees_enforce_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER checklist_item_assignees_enforce_workspace BEFORE INSERT OR UPDATE OF checklist_item_id, user_id ON public.checklist_item_assignees FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_assignee_workspace();


--
-- Name: checklist_items checklist_items_enforce_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER checklist_items_enforce_workspace BEFORE INSERT OR UPDATE OF checklist_id, section_id ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_item_workspace();


--
-- Name: checklists checklists_enforce_request_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER checklists_enforce_request_workspace BEFORE INSERT OR UPDATE OF workspace_id, request_id ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.enforce_checklist_request_workspace();


--
-- Name: workspace_member_types member_types_protect_default; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER member_types_protect_default BEFORE DELETE OR UPDATE ON public.workspace_member_types FOR EACH ROW EXECUTE FUNCTION moc_private.protect_default_member_type();


--
-- Name: requests record_request_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER record_request_activity AFTER INSERT OR UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.record_request_activity();


--
-- Name: request_assignees request_assignees_enforce_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_assignees_enforce_workspace BEFORE INSERT OR UPDATE OF request_id, user_id ON public.request_assignees FOR EACH ROW EXECUTE FUNCTION public.enforce_request_assignee_workspace();


--
-- Name: requests requests_enqueue_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requests_enqueue_notification AFTER INSERT OR UPDATE OF status ON public.requests FOR EACH ROW EXECUTE FUNCTION public.enqueue_request_notification();


--
-- Name: workspaces seed_default_request_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER seed_default_request_categories AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION moc_private.seed_default_request_categories();


--
-- Name: bookings set_booking_tracking_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_booking_tracking_code BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_tracking_code();


--
-- Name: bookings set_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: broadcasts set_broadcasts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_deliveries set_notification_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_notification_deliveries_updated_at BEFORE UPDATE ON public.notification_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_outbox set_notification_outbox_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_notification_outbox_updated_at BEFORE UPDATE ON public.notification_outbox FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_routes set_notification_routes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_notification_routes_updated_at BEFORE UPDATE ON public.notification_routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_settings set_notification_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: requests set_request_tracking_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_request_tracking_code BEFORE INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.set_request_tracking_code();


--
-- Name: streams set_streams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_streams_updated_at BEFORE UPDATE ON public.streams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checklist_templates set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: checklists set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: request_categories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.request_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: requests set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: venue_bookings set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: venue_events set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.venue_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: venues set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: workspaces set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: youtube_connections set_youtube_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_youtube_connections_updated_at BEFORE UPDATE ON public.youtube_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: zoom_connections set_zoom_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_zoom_connections_updated_at BEFORE UPDATE ON public.zoom_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: zoom_meetings set_zoom_meetings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_zoom_meetings_updated_at BEFORE UPDATE ON public.zoom_meetings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bookings stamp_booking_returned_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stamp_booking_returned_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.stamp_booking_returned_at();


--
-- Name: streams streams_enqueue_created_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER streams_enqueue_created_notification AFTER INSERT ON public.streams FOR EACH ROW EXECUTE FUNCTION public.enqueue_stream_created_notification();


--
-- Name: bookings sync_equipment_status_from_booking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_equipment_status_from_booking AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_status_from_booking();


--
-- Name: booking_items sync_equipment_status_from_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_equipment_status_from_item AFTER INSERT OR DELETE ON public.booking_items FOR EACH ROW EXECUTE FUNCTION public.sync_equipment_status_from_item();


--
-- Name: telegram_group_topics telegram_group_topics_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER telegram_group_topics_set_updated_at BEFORE UPDATE ON public.telegram_group_topics FOR EACH ROW EXECUTE FUNCTION public.set_telegram_group_topics_updated_at();


--
-- Name: telegram_groups telegram_groups_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER telegram_groups_set_updated_at BEFORE UPDATE ON public.telegram_groups FOR EACH ROW EXECUTE FUNCTION public.set_telegram_groups_updated_at();


--
-- Name: template_items template_items_enforce_workspace; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER template_items_enforce_workspace BEFORE INSERT OR UPDATE OF checklist_template_id, template_section_id ON public.template_items FOR EACH ROW EXECUTE FUNCTION public.enforce_template_item_workspace();


--
-- Name: venue_booking_slots venue_booking_slots_enforce_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_booking_slots_enforce_parent BEFORE INSERT OR UPDATE ON public.venue_booking_slots FOR EACH ROW EXECUTE FUNCTION public.enforce_venue_booking_slot_parent();


--
-- Name: venue_bookings venue_bookings_enqueue_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_bookings_enqueue_notification AFTER INSERT OR UPDATE OF status ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.enqueue_venue_booking_notification();


--
-- Name: venue_bookings venue_bookings_enqueue_status_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_bookings_enqueue_status_notification AFTER UPDATE OF status ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.enqueue_venue_booking_status_notification();


--
-- Name: venue_bookings venue_bookings_reset_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_bookings_reset_approval BEFORE UPDATE ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.reset_venue_booking_approval_on_reschedule();


--
-- Name: venue_bookings venue_bookings_sync_slot_active; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venue_bookings_sync_slot_active AFTER UPDATE OF status ON public.venue_bookings FOR EACH ROW EXECUTE FUNCTION public.sync_venue_booking_slot_active();


--
-- Name: workspace_users workspace_users_default_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workspace_users_default_type BEFORE INSERT ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION moc_private.assign_default_member_type();


--
-- Name: workspace_users workspace_users_protect_last_manager; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workspace_users_protect_last_manager BEFORE DELETE OR UPDATE OF role_id ON public.workspace_users FOR EACH ROW EXECUTE FUNCTION public.protect_last_workspace_manager();


--
-- Name: workspaces workspaces_default_member_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workspaces_default_member_type AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION moc_private.create_default_member_type();


--
-- Name: zoom_meetings zoom_meetings_cleanup_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zoom_meetings_cleanup_notifications AFTER DELETE ON public.zoom_meetings FOR EACH ROW EXECUTE FUNCTION public.cleanup_zoom_meeting_notifications();


--
-- Name: zoom_meetings zoom_meetings_enqueue_created_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zoom_meetings_enqueue_created_notification AFTER INSERT ON public.zoom_meetings FOR EACH ROW EXECUTE FUNCTION public.enqueue_meeting_created_notification();


--
-- Name: integration_oauth_tokens integration_oauth_tokens_workspace_id_fkey; Type: FK CONSTRAINT; Schema: moc_private; Owner: -
--

ALTER TABLE ONLY moc_private.integration_oauth_tokens
    ADD CONSTRAINT integration_oauth_tokens_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: booking_items booking_items_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_items booking_items_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: broadcast_items broadcast_items_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_items
    ADD CONSTRAINT broadcast_items_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE;


--
-- Name: broadcasts broadcasts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: broadcasts broadcasts_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: checklist_item_assignees checklist_item_assignees_checklist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_item_assignees
    ADD CONSTRAINT checklist_item_assignees_checklist_item_id_fkey FOREIGN KEY (checklist_item_id) REFERENCES public.checklist_items(id) ON DELETE CASCADE;


--
-- Name: checklist_item_assignees checklist_item_assignees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_item_assignees
    ADD CONSTRAINT checklist_item_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: checklist_items checklist_items_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;


--
-- Name: checklist_items checklist_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.checklist_sections(id) ON DELETE CASCADE;


--
-- Name: checklist_sections checklist_sections_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_sections
    ADD CONSTRAINT checklist_sections_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;


--
-- Name: checklist_templates checklist_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_templates
    ADD CONSTRAINT checklist_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: checklists checklists_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL;


--
-- Name: checklists checklists_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_deliveries notification_deliveries_parent_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_parent_delivery_id_fkey FOREIGN KEY (parent_delivery_id) REFERENCES public.notification_deliveries(id) ON DELETE SET NULL;


--
-- Name: notification_deliveries notification_deliveries_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_deliveries notification_deliveries_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.notification_routes(id) ON DELETE SET NULL;


--
-- Name: notification_deliveries notification_deliveries_scheduled_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_scheduled_occurrence_id_fkey FOREIGN KEY (scheduled_occurrence_id) REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE;


--
-- Name: notification_deliveries notification_deliveries_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_message_templates notification_message_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_message_templates
    ADD CONSTRAINT notification_message_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_outbox notification_outbox_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_routes notification_routes_group_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_routes
    ADD CONSTRAINT notification_routes_group_chat_id_fkey FOREIGN KEY (group_chat_id) REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE;


--
-- Name: notification_routes notification_routes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_routes
    ADD CONSTRAINT notification_routes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_routes notification_routes_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_routes
    ADD CONSTRAINT notification_routes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: request_activity request_activity_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_activity
    ADD CONSTRAINT request_activity_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: request_activity request_activity_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_activity
    ADD CONSTRAINT request_activity_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_assignees request_assignees_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_assignees
    ADD CONSTRAINT request_assignees_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: request_assignees request_assignees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_assignees
    ADD CONSTRAINT request_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: request_categories request_categories_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_categories
    ADD CONSTRAINT request_categories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: request_comments request_comments_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: request_comments request_comments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_comments
    ADD CONSTRAINT request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: requests requests_workspace_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_workspace_category_fkey FOREIGN KEY (workspace_id, category) REFERENCES public.request_categories(workspace_id, key) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: requests requests_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_occurrences scheduled_message_occurrences_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_occurrences
    ADD CONSTRAINT scheduled_message_occurrences_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_occurrences scheduled_message_occurrences_workspace_id_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_occurrences
    ADD CONSTRAINT scheduled_message_occurrences_workspace_id_schedule_id_fkey FOREIGN KEY (workspace_id, schedule_id) REFERENCES public.scheduled_message_schedules(workspace_id, id);


--
-- Name: scheduled_message_responses scheduled_message_responses_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_responses
    ADD CONSTRAINT scheduled_message_responses_occurrence_id_fkey FOREIGN KEY (occurrence_id) REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_responses scheduled_message_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_responses
    ADD CONSTRAINT scheduled_message_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_schedules scheduled_message_schedules_group_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_schedules
    ADD CONSTRAINT scheduled_message_schedules_group_chat_id_fkey FOREIGN KEY (group_chat_id) REFERENCES public.telegram_groups(chat_id);


--
-- Name: scheduled_message_schedules scheduled_message_schedules_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_schedules
    ADD CONSTRAINT scheduled_message_schedules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_schedules scheduled_message_schedules_workspace_id_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_schedules
    ADD CONSTRAINT scheduled_message_schedules_workspace_id_template_id_fkey FOREIGN KEY (workspace_id, template_id) REFERENCES public.scheduled_message_templates(workspace_id, id);


--
-- Name: scheduled_message_series_changes scheduled_message_series_changes_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_series_changes
    ADD CONSTRAINT scheduled_message_series_changes_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.scheduled_message_schedules(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_sessions scheduled_message_sessions_occurrence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_sessions
    ADD CONSTRAINT scheduled_message_sessions_occurrence_id_fkey FOREIGN KEY (occurrence_id) REFERENCES public.scheduled_message_occurrences(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_sessions scheduled_message_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_sessions
    ADD CONSTRAINT scheduled_message_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_sessions scheduled_message_sessions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_sessions
    ADD CONSTRAINT scheduled_message_sessions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: scheduled_message_templates scheduled_message_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_message_templates
    ADD CONSTRAINT scheduled_message_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: streams streams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: streams streams_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: telegram_group_topics telegram_group_topics_group_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_group_topics
    ADD CONSTRAINT telegram_group_topics_group_chat_id_fkey FOREIGN KEY (group_chat_id) REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE;


--
-- Name: telegram_groups telegram_groups_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_groups
    ADD CONSTRAINT telegram_groups_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: telegram_link_tokens telegram_link_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: template_items template_items_checklist_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_checklist_template_id_fkey FOREIGN KEY (checklist_template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE;


--
-- Name: template_items template_items_template_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_template_section_id_fkey FOREIGN KEY (template_section_id) REFERENCES public.template_sections(id) ON DELETE CASCADE;


--
-- Name: template_sections template_sections_checklist_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_sections
    ADD CONSTRAINT template_sections_checklist_template_id_fkey FOREIGN KEY (checklist_template_id) REFERENCES public.checklist_templates(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES moc_auth."user"(id) ON DELETE CASCADE;


--
-- Name: venue_booking_slots venue_booking_slots_venue_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_booking_slots
    ADD CONSTRAINT venue_booking_slots_venue_booking_id_fkey FOREIGN KEY (venue_booking_id) REFERENCES public.venue_bookings(id) ON DELETE CASCADE;


--
-- Name: venue_booking_slots venue_booking_slots_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_booking_slots
    ADD CONSTRAINT venue_booking_slots_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;


--
-- Name: venue_bookings venue_bookings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: venue_bookings venue_bookings_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: venue_bookings venue_bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.venue_events(id) ON DELETE RESTRICT;


--
-- Name: venue_bookings venue_bookings_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: venue_bookings venue_bookings_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE RESTRICT;


--
-- Name: venue_bookings venue_bookings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_bookings
    ADD CONSTRAINT venue_bookings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: venue_events venue_events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue_events
    ADD CONSTRAINT venue_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: venues venues_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venues
    ADD CONSTRAINT venues_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_join_requests workspace_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_join_requests
    ADD CONSTRAINT workspace_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_join_requests workspace_join_requests_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_join_requests
    ADD CONSTRAINT workspace_join_requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_member_types workspace_member_types_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_member_types
    ADD CONSTRAINT workspace_member_types_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_users workspace_users_member_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_member_type FOREIGN KEY (workspace_id, member_type_id) REFERENCES public.workspace_member_types(workspace_id, id);


--
-- Name: workspace_users workspace_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: workspace_users workspace_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_users workspace_users_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: youtube_connections youtube_connections_connected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_connections
    ADD CONSTRAINT youtube_connections_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES public.users(id);


--
-- Name: youtube_connections youtube_connections_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.youtube_connections
    ADD CONSTRAINT youtube_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: zoom_connections zoom_connections_connected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_connections
    ADD CONSTRAINT zoom_connections_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES public.users(id);


--
-- Name: zoom_connections zoom_connections_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_connections
    ADD CONSTRAINT zoom_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: zoom_meetings zoom_meetings_connection_workspace_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_meetings
    ADD CONSTRAINT zoom_meetings_connection_workspace_fkey FOREIGN KEY (zoom_connection_id, workspace_id) REFERENCES public.zoom_connections(id, workspace_id) ON DELETE CASCADE;


--
-- Name: zoom_meetings zoom_meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_meetings
    ADD CONSTRAINT zoom_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: zoom_meetings zoom_meetings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zoom_meetings
    ADD CONSTRAINT zoom_meetings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: integration_oauth_tokens; Type: ROW SECURITY; Schema: moc_private; Owner: -
--

ALTER TABLE moc_private.integration_oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: api_rate_limit_windows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_rate_limit_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_items booking_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY booking_items_select ON public.booking_items FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.id = booking_items.booking_id) AND (moc_private.is_workspace_member(b.workspace_id) AND moc_private.current_user_can(b.workspace_id, 'can_read'::text))))));


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_delete ON public.bookings FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: bookings bookings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_select ON public.bookings FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: bookings bookings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_update ON public.bookings FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: broadcast_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcast_items ENABLE ROW LEVEL SECURITY;

--
-- Name: broadcast_items broadcast_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcast_items_delete ON public.broadcast_items FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE ((broadcasts.id = broadcast_items.broadcast_id) AND (moc_private.current_user_can(broadcasts.workspace_id, 'can_delete'::text) OR moc_private.current_user_can(broadcasts.workspace_id, 'can_update'::text))))));


--
-- Name: broadcast_items broadcast_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcast_items_insert ON public.broadcast_items FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE ((broadcasts.id = broadcast_items.broadcast_id) AND (moc_private.current_user_can(broadcasts.workspace_id, 'can_create'::text) OR moc_private.current_user_can(broadcasts.workspace_id, 'can_update'::text))))));


--
-- Name: broadcast_items broadcast_items_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcast_items_public_select ON public.broadcast_items FOR SELECT TO moc_app, moc_public USING ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE (broadcasts.id = broadcast_items.broadcast_id))));


--
-- Name: broadcast_items broadcast_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcast_items_select ON public.broadcast_items FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE ((broadcasts.id = broadcast_items.broadcast_id) AND moc_private.is_workspace_member(broadcasts.workspace_id)))));


--
-- Name: broadcast_items broadcast_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcast_items_update ON public.broadcast_items FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE ((broadcasts.id = broadcast_items.broadcast_id) AND moc_private.current_user_can(broadcasts.workspace_id, 'can_update'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.broadcasts
  WHERE ((broadcasts.id = broadcast_items.broadcast_id) AND moc_private.current_user_can(broadcasts.workspace_id, 'can_update'::text)))));


--
-- Name: broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: broadcasts broadcasts_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_delete ON public.broadcasts FOR DELETE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_delete'::text));


--
-- Name: broadcasts broadcasts_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_insert ON public.broadcasts FOR INSERT TO moc_app WITH CHECK (moc_private.current_user_can(workspace_id, 'can_create'::text));


--
-- Name: broadcasts broadcasts_public_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_public_select ON public.broadcasts FOR SELECT TO moc_app, moc_public USING (true);


--
-- Name: broadcasts broadcasts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_select ON public.broadcasts FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: broadcasts broadcasts_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY broadcasts_update ON public.broadcasts FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_update'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_update'::text));


--
-- Name: checklist_item_assignees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_item_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_item_assignees checklist_item_assignees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_item_assignees_delete ON public.checklist_item_assignees FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM (public.checklist_items
     JOIN public.checklists ON ((checklists.id = checklist_items.checklist_id)))
  WHERE ((checklist_items.id = checklist_item_assignees.checklist_item_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_delete'::text))))));


--
-- Name: checklist_item_assignees checklist_item_assignees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_item_assignees_insert ON public.checklist_item_assignees FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.checklist_items
     JOIN public.checklists ON ((checklists.id = checklist_items.checklist_id)))
  WHERE ((checklist_items.id = checklist_item_assignees.checklist_item_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_create'::text))))));


--
-- Name: checklist_item_assignees checklist_item_assignees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_item_assignees_select ON public.checklist_item_assignees FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM (public.checklist_items
     JOIN public.checklists ON ((checklists.id = checklist_items.checklist_id)))
  WHERE ((checklist_items.id = checklist_item_assignees.checklist_item_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_read'::text))))));


--
-- Name: checklist_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_items checklist_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_items_delete ON public.checklist_items FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_items.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_delete'::text))))));


--
-- Name: checklist_items checklist_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_items_insert ON public.checklist_items FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_items.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_create'::text))))));


--
-- Name: checklist_items checklist_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_items_select ON public.checklist_items FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_items.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_read'::text))))));


--
-- Name: checklist_items checklist_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_items_update ON public.checklist_items FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_items.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_update'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_items.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_update'::text))))));


--
-- Name: checklist_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_sections checklist_sections_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_sections_delete ON public.checklist_sections FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_sections.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_delete'::text))))));


--
-- Name: checklist_sections checklist_sections_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_sections_insert ON public.checklist_sections FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_sections.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_create'::text))))));


--
-- Name: checklist_sections checklist_sections_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_sections_select ON public.checklist_sections FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_sections.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_read'::text))))));


--
-- Name: checklist_sections checklist_sections_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_sections_update ON public.checklist_sections FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_sections.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_update'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklists
  WHERE ((checklists.id = checklist_sections.checklist_id) AND (moc_private.is_workspace_member(checklists.workspace_id) AND moc_private.current_user_can(checklists.workspace_id, 'can_update'::text))))));


--
-- Name: checklist_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: checklist_templates checklist_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_templates_delete ON public.checklist_templates FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: checklist_templates checklist_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_templates_insert ON public.checklist_templates FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: checklist_templates checklist_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_templates_select ON public.checklist_templates FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: checklist_templates checklist_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklist_templates_update ON public.checklist_templates FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: checklists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

--
-- Name: checklists checklists_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_delete ON public.checklists FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: checklists checklists_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_insert ON public.checklists FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: checklists checklists_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_select ON public.checklists FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: checklists checklists_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY checklists_update ON public.checklists FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: equipment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment equipment_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY equipment_delete ON public.equipment FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: equipment equipment_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY equipment_insert ON public.equipment FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: equipment equipment_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY equipment_select ON public.equipment FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: equipment equipment_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY equipment_update ON public.equipment FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: workspace_member_types member_types_create; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_types_create ON public.workspace_member_types FOR INSERT TO moc_app WITH CHECK ((moc_private.current_user_can(workspace_id, 'can_update'::text) AND (NOT is_default)));


--
-- Name: workspace_member_types member_types_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_types_read ON public.workspace_member_types FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: workspace_member_types member_types_rename; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_types_rename ON public.workspace_member_types FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_update'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_update'::text));


--
-- Name: notification_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_ingest_replays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_ingest_replays ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_message_templates notification_message_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_message_templates_delete ON public.notification_message_templates FOR DELETE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_message_templates notification_message_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_message_templates_insert ON public.notification_message_templates FOR INSERT TO moc_app WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_message_templates notification_message_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_message_templates_select ON public.notification_message_templates FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: notification_message_templates notification_message_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_message_templates_update ON public.notification_message_templates FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_outbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_routes notification_routes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_routes_delete ON public.notification_routes FOR DELETE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_routes notification_routes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_routes_insert ON public.notification_routes FOR INSERT TO moc_app WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_routes notification_routes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_routes_select ON public.notification_routes FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: notification_routes notification_routes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_routes_update ON public.notification_routes FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_settings notification_settings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_settings_delete ON public.notification_settings FOR DELETE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_settings notification_settings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_settings_insert ON public.notification_settings FOR INSERT TO moc_app WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: notification_settings notification_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_settings_select ON public.notification_settings FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: notification_settings notification_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_settings_update ON public.notification_settings FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: request_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: request_activity request_activity_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_activity_select ON public.request_activity FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_activity.request_id) AND moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_read'::text)))));


--
-- Name: request_assignees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_assignees ENABLE ROW LEVEL SECURITY;

--
-- Name: request_assignees request_assignees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_assignees_delete ON public.request_assignees FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_assignees.request_id) AND (moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_delete'::text))))));


--
-- Name: request_assignees request_assignees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_assignees_insert ON public.request_assignees FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_assignees.request_id) AND (moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_create'::text))))));


--
-- Name: request_assignees request_assignees_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_assignees_select ON public.request_assignees FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_assignees.request_id) AND (moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_read'::text))))));


--
-- Name: request_assignees request_assignees_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_assignees_update ON public.request_assignees FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_assignees.request_id) AND (moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_update'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_assignees.request_id) AND (moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_update'::text))))));


--
-- Name: request_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: request_categories request_categories_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_categories_delete ON public.request_categories FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: request_categories request_categories_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_categories_insert ON public.request_categories FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: request_categories request_categories_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_categories_select ON public.request_categories FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: request_categories request_categories_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_categories_update ON public.request_categories FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: request_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: request_comments request_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_comments_insert ON public.request_comments FOR INSERT TO moc_app WITH CHECK (((actor_id = moc_private.actor_id()) AND (EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_comments.request_id) AND moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_update'::text))))));


--
-- Name: request_comments request_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY request_comments_select ON public.request_comments FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.requests
  WHERE ((requests.id = request_comments.request_id) AND moc_private.is_workspace_member(requests.workspace_id) AND moc_private.current_user_can(requests.workspace_id, 'can_read'::text)))));


--
-- Name: requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

--
-- Name: requests requests_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY requests_delete ON public.requests FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: requests requests_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY requests_insert ON public.requests FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: requests requests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY requests_select ON public.requests FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: requests requests_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY requests_update ON public.requests FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select ON public.roles FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.workspace_users
  WHERE (workspace_users.user_id = ( SELECT moc_private.actor_id() AS actor_id)))));


--
-- Name: scheduled_message_occurrences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_occurrences ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_series_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_series_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_message_occurrences scheduled_occurrences_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_occurrences_read ON public.scheduled_message_occurrences FOR SELECT TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_update'::text));


--
-- Name: scheduled_message_schedules scheduled_schedules_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_schedules_read ON public.scheduled_message_schedules FOR SELECT TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_update'::text));


--
-- Name: scheduled_message_templates scheduled_templates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_templates_read ON public.scheduled_message_templates FOR SELECT TO moc_app USING (((deleted_at IS NULL) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: streams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

--
-- Name: streams streams_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_delete ON public.streams FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: streams streams_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_insert ON public.streams FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: streams streams_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_select ON public.streams FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: streams streams_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY streams_update ON public.streams FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: telegram_group_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_group_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_group_topics telegram_group_topics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_group_topics_select ON public.telegram_group_topics FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.telegram_groups telegram_group
  WHERE ((telegram_group.chat_id = telegram_group_topics.group_chat_id) AND moc_private.is_workspace_member(telegram_group.workspace_id)))));


--
-- Name: telegram_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_groups telegram_groups_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_groups_select ON public.telegram_groups FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: telegram_groups telegram_groups_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_groups_update ON public.telegram_groups FOR UPDATE TO moc_app USING (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text)) WITH CHECK (moc_private.current_user_can(workspace_id, 'can_manage_roles'::text));


--
-- Name: telegram_link_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_link_tokens telegram_link_tokens_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_link_tokens_delete_self ON public.telegram_link_tokens FOR DELETE TO moc_app USING ((user_id = moc_private.actor_id()));


--
-- Name: telegram_link_tokens telegram_link_tokens_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_link_tokens_insert_self ON public.telegram_link_tokens FOR INSERT TO moc_app WITH CHECK ((user_id = moc_private.actor_id()));


--
-- Name: telegram_link_tokens telegram_link_tokens_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_link_tokens_select_self ON public.telegram_link_tokens FOR SELECT TO moc_app USING ((user_id = moc_private.actor_id()));


--
-- Name: telegram_webhook_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_webhook_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: template_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

--
-- Name: template_items template_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_items_delete ON public.template_items FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_items.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_delete'::text))))));


--
-- Name: template_items template_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_items_insert ON public.template_items FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_items.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_create'::text))))));


--
-- Name: template_items template_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_items_select ON public.template_items FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_items.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_read'::text))))));


--
-- Name: template_items template_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_items_update ON public.template_items FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_items.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_update'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_items.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_update'::text))))));


--
-- Name: template_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: template_sections template_sections_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_sections_delete ON public.template_sections FOR DELETE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_sections.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_delete'::text))))));


--
-- Name: template_sections template_sections_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_sections_insert ON public.template_sections FOR INSERT TO moc_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_sections.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_create'::text))))));


--
-- Name: template_sections template_sections_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_sections_select ON public.template_sections FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_sections.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_read'::text))))));


--
-- Name: template_sections template_sections_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_sections_update ON public.template_sections FOR UPDATE TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_sections.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_update'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.checklist_templates
  WHERE ((checklist_templates.id = template_sections.checklist_template_id) AND (moc_private.is_workspace_member(checklist_templates.workspace_id) AND moc_private.current_user_can(checklist_templates.workspace_id, 'can_update'::text))))));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select ON public.users FOR SELECT TO moc_app USING (((id = moc_private.actor_id()) OR (EXISTS ( SELECT 1
   FROM public.workspace_users target_membership
  WHERE ((target_membership.user_id = users.id) AND moc_private.is_workspace_member(target_membership.workspace_id)))) OR (EXISTS ( SELECT 1
   FROM public.workspace_join_requests pending
  WHERE ((pending.user_id = users.id) AND moc_private.current_user_can(pending.workspace_id, 'can_manage_roles'::text))))));


--
-- Name: users users_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update ON public.users FOR UPDATE TO moc_app USING ((id = moc_private.actor_id())) WITH CHECK ((id = moc_private.actor_id()));


--
-- Name: venue_booking_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venue_booking_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: venue_booking_slots venue_booking_slots_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_booking_slots_select ON public.venue_booking_slots FOR SELECT TO moc_app USING ((EXISTS ( SELECT 1
   FROM public.venue_bookings booking
  WHERE ((booking.id = venue_booking_slots.venue_booking_id) AND moc_private.is_workspace_member(booking.workspace_id) AND moc_private.current_user_can(booking.workspace_id, 'can_read'::text)))));


--
-- Name: venue_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: venue_bookings venue_bookings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_bookings_delete ON public.venue_bookings FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: venue_bookings venue_bookings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_bookings_select ON public.venue_bookings FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: venue_bookings venue_bookings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_bookings_update ON public.venue_bookings FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: venue_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venue_events ENABLE ROW LEVEL SECURITY;

--
-- Name: venue_events venue_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_events_delete ON public.venue_events FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: venue_events venue_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_events_insert ON public.venue_events FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: venue_events venue_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_events_select ON public.venue_events FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: venue_events venue_events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venue_events_update ON public.venue_events FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: venues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

--
-- Name: venues venues_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venues_delete ON public.venues FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: venues venues_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venues_insert ON public.venues FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: venues venues_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venues_select ON public.venues FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: venues venues_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY venues_update ON public.venues FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: workspace_join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_join_requests workspace_join_requests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_join_requests_select ON public.workspace_join_requests FOR SELECT TO moc_app USING (((user_id = moc_private.actor_id()) OR moc_private.current_user_can(workspace_id, 'can_manage_roles'::text)));


--
-- Name: workspace_member_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_member_types ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_users ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_users workspace_users_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspace_users_select ON public.workspace_users FOR SELECT TO moc_app USING (moc_private.is_workspace_member(workspace_id));


--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces workspaces_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_select ON public.workspaces FOR SELECT TO moc_app USING (moc_private.is_workspace_member(id));


--
-- Name: workspaces workspaces_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE TO moc_app USING (moc_private.current_user_can(id, 'can_manage_roles'::text)) WITH CHECK (moc_private.current_user_can(id, 'can_manage_roles'::text));


--
-- Name: youtube_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: youtube_connections youtube_connections_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY youtube_connections_select ON public.youtube_connections FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: youtube_connections youtube_connections_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY youtube_connections_update ON public.youtube_connections FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: zoom_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zoom_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: zoom_connections zoom_connections_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zoom_connections_select ON public.zoom_connections FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: zoom_meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: zoom_meetings zoom_meetings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zoom_meetings_delete ON public.zoom_meetings FOR DELETE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_delete'::text)));


--
-- Name: zoom_meetings zoom_meetings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zoom_meetings_insert ON public.zoom_meetings FOR INSERT TO moc_app WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_create'::text)));


--
-- Name: zoom_meetings zoom_meetings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zoom_meetings_select ON public.zoom_meetings FOR SELECT TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_read'::text)));


--
-- Name: zoom_meetings zoom_meetings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zoom_meetings_update ON public.zoom_meetings FOR UPDATE TO moc_app USING ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text))) WITH CHECK ((moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_update'::text)));


--
-- Name: SCHEMA moc_private; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA moc_private TO moc_app;
GRANT USAGE ON SCHEMA moc_private TO moc_public;
GRANT USAGE ON SCHEMA moc_private TO moc_worker;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO moc_app;
GRANT USAGE ON SCHEMA public TO moc_public;
GRANT USAGE ON SCHEMA public TO moc_worker;


--
-- Name: FUNCTION assign_default_member_type(); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.assign_default_member_type() FROM PUBLIC;


--
-- Name: FUNCTION create_default_member_type(); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.create_default_member_type() FROM PUBLIC;


--
-- Name: FUNCTION current_user_can(p_workspace_id uuid, p_permission text); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.current_user_can(p_workspace_id uuid, p_permission text) FROM PUBLIC;
GRANT ALL ON FUNCTION moc_private.current_user_can(p_workspace_id uuid, p_permission text) TO moc_app;


--
-- Name: FUNCTION expand_venue_booking_slots(p_workspace_id uuid, p_slot_starts timestamp with time zone[], p_recurrence jsonb); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.expand_venue_booking_slots(p_workspace_id uuid, p_slot_starts timestamp with time zone[], p_recurrence jsonb) FROM PUBLIC;


--
-- Name: FUNCTION is_workspace_member(p_workspace_id uuid); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.is_workspace_member(p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION moc_private.is_workspace_member(p_workspace_id uuid) TO moc_app;


--
-- Name: FUNCTION protect_default_member_type(); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.protect_default_member_type() FROM PUBLIC;


--
-- Name: FUNCTION queue_scheduled_message(p_id uuid, p_operation text); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.queue_scheduled_message(p_id uuid, p_operation text) FROM PUBLIC;


--
-- Name: FUNCTION scheduled_actor_can(p_actor uuid, p_workspace uuid); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.scheduled_actor_can(p_actor uuid, p_workspace uuid) FROM PUBLIC;


--
-- Name: FUNCTION scheduled_validate_destination(p_workspace uuid, p_chat text, p_thread bigint); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.scheduled_validate_destination(p_workspace uuid, p_chat text, p_thread bigint) FROM PUBLIC;


--
-- Name: FUNCTION scheduled_validate_fields(p_type text, p_fields jsonb); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.scheduled_validate_fields(p_type text, p_fields jsonb) FROM PUBLIC;


--
-- Name: FUNCTION scheduled_validate_groups(p_type text, p_groups jsonb); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.scheduled_validate_groups(p_type text, p_groups jsonb) FROM PUBLIC;


--
-- Name: FUNCTION seed_default_request_categories(); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.seed_default_request_categories() FROM PUBLIC;


--
-- Name: FUNCTION venue_recurrence_dates(p_start_date date, p_recurrence jsonb); Type: ACL; Schema: moc_private; Owner: -
--

REVOKE ALL ON FUNCTION moc_private.venue_recurrence_dates(p_start_date date, p_recurrence jsonb) FROM PUBLIC;


--
-- Name: FUNCTION api_apply_telegram_action(p_telegram_user_id text, p_entity_type text, p_entity_id uuid, p_action text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_apply_telegram_action(p_telegram_user_id text, p_entity_type text, p_entity_id uuid, p_action text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_apply_telegram_action(p_telegram_user_id text, p_entity_type text, p_entity_id uuid, p_action text) TO moc_worker;


--
-- Name: FUNCTION api_delete_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_delete_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_delete_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone) TO moc_worker;


--
-- Name: FUNCTION api_lookup_tracking_submission(p_tracking_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_lookup_tracking_submission(p_tracking_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_lookup_tracking_submission(p_tracking_code text) TO moc_worker;


--
-- Name: FUNCTION api_lookup_tracking_venue_booking(p_tracking_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_lookup_tracking_venue_booking(p_tracking_code text) TO moc_worker;


--
-- Name: FUNCTION api_update_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_update_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_update_tracking_submission(p_tracking_code text, p_type text, p_updated_at timestamp with time zone, p_data jsonb) TO moc_worker;


--
-- Name: FUNCTION api_update_tracking_venue_booking(p_tracking_code text, p_updated_at timestamp with time zone, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.api_update_tracking_venue_booking(p_tracking_code text, p_updated_at timestamp with time zone, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.api_update_tracking_venue_booking(p_tracking_code text, p_updated_at timestamp with time zone, p_data jsonb) TO moc_worker;


--
-- Name: FUNCTION approve_workspace_join_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.approve_workspace_join_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.approve_workspace_join_request(p_request_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.approve_workspace_join_request(p_request_id uuid) TO moc_worker;


--
-- Name: TABLE requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.requests TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.requests TO moc_app;


--
-- Name: FUNCTION archive_completed_requests(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.archive_completed_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION public.archive_completed_requests() TO moc_worker;


--
-- Name: TABLE bookings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bookings TO moc_worker;
GRANT SELECT,DELETE,UPDATE ON TABLE public.bookings TO moc_app;


--
-- Name: FUNCTION archive_returned_bookings(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.archive_returned_bookings() FROM PUBLIC;
GRANT ALL ON FUNCTION public.archive_returned_bookings() TO moc_worker;


--
-- Name: FUNCTION begin_scheduled_delivery(p_delivery uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.begin_scheduled_delivery(p_delivery uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.begin_scheduled_delivery(p_delivery uuid) TO moc_worker;


--
-- Name: FUNCTION change_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_field text, p_value text, p_scope text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.change_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_field text, p_value text, p_scope text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.change_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_field text, p_value text, p_scope text) TO moc_worker;


--
-- Name: FUNCTION claim_notification_ingest_nonce(p_nonce text, p_expires_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_notification_ingest_nonce(p_nonce text, p_expires_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_notification_ingest_nonce(p_nonce text, p_expires_at timestamp with time zone) TO moc_worker;


--
-- Name: FUNCTION claim_telegram_webhook_update(p_update_id bigint, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_telegram_webhook_update(p_update_id bigint, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_telegram_webhook_update(p_update_id bigint, p_payload jsonb) TO moc_worker;


--
-- Name: FUNCTION cleanup_zoom_meeting_notifications(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cleanup_zoom_meeting_notifications() FROM PUBLIC;
GRANT ALL ON FUNCTION public.cleanup_zoom_meeting_notifications() TO moc_worker;


--
-- Name: FUNCTION complete_integration_oauth_token_refresh(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.complete_integration_oauth_token_refresh(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_integration_oauth_token_refresh(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone) TO moc_worker;


--
-- Name: FUNCTION complete_telegram_webhook_update(p_update_id bigint); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.complete_telegram_webhook_update(p_update_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.complete_telegram_webhook_update(p_update_id bigint) TO moc_worker;


--
-- Name: FUNCTION consume_api_rate_limit(p_policy text, p_subject_hash text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(p_policy text, p_subject_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_api_rate_limit(p_policy text, p_subject_hash text) TO moc_worker;


--
-- Name: FUNCTION consume_telegram_link_token(p_token text, p_telegram_chat_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.consume_telegram_link_token(p_token text, p_telegram_chat_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.consume_telegram_link_token(p_token text, p_telegram_chat_id text) TO moc_worker;


--
-- Name: FUNCTION create_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid, p_title text, p_description text, p_slug text, p_kind public.broadcast_kind, p_items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid, p_title text, p_description text, p_slug text, p_kind public.broadcast_kind, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid, p_title text, p_description text, p_slug text, p_kind public.broadcast_kind, p_items jsonb) TO moc_app;
GRANT ALL ON FUNCTION public.create_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid, p_title text, p_description text, p_slug text, p_kind public.broadcast_kind, p_items jsonb) TO moc_worker;


--
-- Name: FUNCTION create_checklist_from_template(p_template_id uuid, p_scheduled_at timestamp with time zone, p_name text, p_description text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_checklist_from_template(p_template_id uuid, p_scheduled_at timestamp with time zone, p_name text, p_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_checklist_from_template(p_template_id uuid, p_scheduled_at timestamp with time zone, p_name text, p_description text) TO moc_app;
GRANT ALL ON FUNCTION public.create_checklist_from_template(p_template_id uuid, p_scheduled_at timestamp with time zone, p_name text, p_description text) TO moc_worker;


--
-- Name: FUNCTION create_scheduled_schedule(p_actor uuid, p_workspace uuid, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_scheduled_schedule(p_actor uuid, p_workspace uuid, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_scheduled_schedule(p_actor uuid, p_workspace uuid, p_data jsonb) TO moc_worker;


--
-- Name: FUNCTION delete_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.delete_broadcast_with_items(p_broadcast_id uuid, p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION delete_integration_oauth_connection(p_provider text, p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_integration_oauth_connection(p_provider text, p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_integration_oauth_connection(p_provider text, p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION delete_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_scope text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_scope text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_scheduled_occurrence(p_actor uuid, p_id uuid, p_revision integer, p_scope text) TO moc_worker;


--
-- Name: FUNCTION delete_scheduled_template(p_actor uuid, p_workspace uuid, p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_scheduled_template(p_actor uuid, p_workspace uuid, p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_scheduled_template(p_actor uuid, p_workspace uuid, p_id uuid) TO moc_worker;


--
-- Name: FUNCTION delete_zoom_integrations_for_user(p_zoom_user_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.delete_zoom_integrations_for_user(p_zoom_user_id text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.delete_zoom_integrations_for_user(p_zoom_user_id text) TO moc_worker;


--
-- Name: FUNCTION enforce_booking_item_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_booking_item_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_booking_item_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_checklist_assignee_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_checklist_assignee_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_checklist_assignee_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_checklist_item_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_checklist_item_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_checklist_item_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_checklist_request_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_checklist_request_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_checklist_request_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_request_assignee_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_request_assignee_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_request_assignee_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_template_item_workspace(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_template_item_workspace() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_template_item_workspace() TO moc_worker;


--
-- Name: FUNCTION enforce_venue_booking_slot_parent(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enforce_venue_booking_slot_parent() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enforce_venue_booking_slot_parent() TO moc_worker;


--
-- Name: FUNCTION enqueue_booking_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_booking_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_booking_notification() TO moc_worker;


--
-- Name: FUNCTION enqueue_meeting_created_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_meeting_created_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_meeting_created_notification() TO moc_worker;


--
-- Name: FUNCTION enqueue_notification_outbox_event(p_workspace_id uuid, p_event_type text, p_entity_type text, p_entity_id uuid, p_event_key text, p_payload jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_notification_outbox_event(p_workspace_id uuid, p_event_type text, p_entity_type text, p_entity_id uuid, p_event_key text, p_payload jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_notification_outbox_event(p_workspace_id uuid, p_event_type text, p_entity_type text, p_entity_id uuid, p_event_key text, p_payload jsonb) TO moc_worker;


--
-- Name: FUNCTION enqueue_request_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_request_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_request_notification() TO moc_worker;


--
-- Name: FUNCTION enqueue_stream_created_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_stream_created_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_stream_created_notification() TO moc_worker;


--
-- Name: FUNCTION enqueue_venue_booking_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_venue_booking_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_venue_booking_notification() TO moc_worker;


--
-- Name: FUNCTION enqueue_venue_booking_status_notification(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.enqueue_venue_booking_status_notification() FROM PUBLIC;
GRANT ALL ON FUNCTION public.enqueue_venue_booking_status_notification() TO moc_worker;


--
-- Name: FUNCTION fail_telegram_webhook_update(p_update_id bigint, p_error text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fail_telegram_webhook_update(p_update_id bigint, p_error text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.fail_telegram_webhook_update(p_update_id bigint, p_error text) TO moc_worker;


--
-- Name: FUNCTION finish_scheduled_delivery(p_delivery uuid, p_revision integer, p_message bigint, p_error text, p_ambiguous boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finish_scheduled_delivery(p_delivery uuid, p_revision integer, p_message bigint, p_error text, p_ambiguous boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.finish_scheduled_delivery(p_delivery uuid, p_revision integer, p_message bigint, p_error text, p_ambiguous boolean) TO moc_worker;


--
-- Name: FUNCTION generate_tracking_code(p_prefix text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.generate_tracking_code(p_prefix text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_tracking_code(p_prefix text) TO moc_worker;


--
-- Name: FUNCTION get_integration_oauth_tokens(p_provider text, p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_integration_oauth_tokens(p_provider text, p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_integration_oauth_tokens(p_provider text, p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION list_signup_workspaces(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.list_signup_workspaces() FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_signup_workspaces() TO moc_public;
GRANT ALL ON FUNCTION public.list_signup_workspaces() TO moc_app;
GRANT ALL ON FUNCTION public.list_signup_workspaces() TO moc_worker;


--
-- Name: FUNCTION mark_integration_oauth_reauth_required_if_refresh_token_matches(p_provider text, p_workspace_id uuid, p_expected_refresh_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(p_provider text, p_workspace_id uuid, p_expected_refresh_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_integration_oauth_reauth_required_if_refresh_token_matches(p_provider text, p_workspace_id uuid, p_expected_refresh_token text) TO moc_worker;


--
-- Name: FUNCTION materialize_scheduled_messages(p_schedule uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.materialize_scheduled_messages(p_schedule uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.materialize_scheduled_messages(p_schedule uuid) TO moc_worker;


--
-- Name: FUNCTION prepare_scheduled_messages(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.prepare_scheduled_messages() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prepare_scheduled_messages() TO moc_worker;


--
-- Name: FUNCTION protect_last_workspace_manager(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.protect_last_workspace_manager() FROM PUBLIC;
GRANT ALL ON FUNCTION public.protect_last_workspace_manager() TO moc_worker;


--
-- Name: FUNCTION public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_search text, p_category public.equipment_category); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_search text, p_category public.equipment_category) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_search text, p_category public.equipment_category) TO moc_public;
GRANT ALL ON FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_search text, p_category public.equipment_category) TO moc_app;
GRANT ALL ON FUNCTION public.public_browse_equipment(p_workspace_id uuid, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_search text, p_category public.equipment_category) TO moc_worker;


--
-- Name: FUNCTION public_list_request_categories(p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_list_request_categories(p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_list_request_categories(p_workspace_id uuid) TO moc_public;
GRANT ALL ON FUNCTION public.public_list_request_categories(p_workspace_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.public_list_request_categories(p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION public_list_venue_events(p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_list_venue_events(p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_list_venue_events(p_workspace_id uuid) TO moc_public;
GRANT ALL ON FUNCTION public.public_list_venue_events(p_workspace_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.public_list_venue_events(p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION public_list_venues(p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_list_venues(p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_list_venues(p_workspace_id uuid) TO moc_public;
GRANT ALL ON FUNCTION public.public_list_venues(p_workspace_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.public_list_venues(p_workspace_id uuid) TO moc_worker;


--
-- Name: FUNCTION public_lookup_tracking(p_tracking_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_lookup_tracking(p_tracking_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_lookup_tracking(p_tracking_code text) TO moc_worker;


--
-- Name: FUNCTION public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text) TO moc_public;
GRANT ALL ON FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text) TO moc_app;
GRANT ALL ON FUNCTION public.public_submit_booking_batch(p_workspace_id uuid, p_title text, p_equipment_ids uuid[], p_booked_by text, p_checked_out_at timestamp with time zone, p_expected_return_at timestamp with time zone, p_notes text, p_requested_equipment text[], p_other_equipment text) TO moc_worker;


--
-- Name: FUNCTION public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text, p_flow text, p_content text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text, p_flow text, p_content text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text, p_flow text, p_content text) TO moc_public;
GRANT ALL ON FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text, p_flow text, p_content text) TO moc_app;
GRANT ALL ON FUNCTION public.public_submit_request(p_workspace_id uuid, p_title text, p_priority public.request_priority, p_category text, p_due_date timestamp with time zone, p_requested_by text, p_who text, p_what text, p_when_text text, p_where_text text, p_why text, p_how text, p_notes text, p_flow text, p_content text) TO moc_worker;


--
-- Name: FUNCTION public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid, p_event_other text, p_notes text, p_recurrence jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid, p_event_other text, p_notes text, p_recurrence jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid, p_event_other text, p_notes text, p_recurrence jsonb) TO moc_public;
GRANT ALL ON FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid, p_event_other text, p_notes text, p_recurrence jsonb) TO moc_app;
GRANT ALL ON FUNCTION public.public_submit_venue_booking(p_workspace_id uuid, p_venue_id uuid, p_requested_by text, p_slot_starts timestamp with time zone[], p_event_id uuid, p_event_other text, p_notes text, p_recurrence jsonb) TO moc_worker;


--
-- Name: FUNCTION public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid) TO moc_public;
GRANT ALL ON FUNCTION public.public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.public_venue_availability(p_workspace_id uuid, p_date date, p_venue_id uuid) TO moc_worker;


--
-- Name: FUNCTION purge_api_maintenance_data(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.purge_api_maintenance_data() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_api_maintenance_data() TO moc_worker;


--
-- Name: FUNCTION record_request_activity(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_request_activity() FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_request_activity() TO moc_worker;


--
-- Name: FUNCTION recover_scheduled_deliveries(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.recover_scheduled_deliveries() FROM PUBLIC;
GRANT ALL ON FUNCTION public.recover_scheduled_deliveries() TO moc_worker;


--
-- Name: FUNCTION refresh_equipment_status_for(p_equipment_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.refresh_equipment_status_for(p_equipment_id uuid) TO moc_worker;


--
-- Name: FUNCTION reject_workspace_join_request(p_request_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reject_workspace_join_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reject_workspace_join_request(p_request_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.reject_workspace_join_request(p_request_id uuid) TO moc_worker;


--
-- Name: FUNCTION release_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_lock_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.release_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_lock_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.release_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_lock_id uuid) TO moc_worker;


--
-- Name: FUNCTION replace_broadcast_playlist(p_broadcast_id uuid, p_workspace_id uuid, p_expected_updated_at timestamp with time zone, p_title text, p_description text, p_items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.replace_broadcast_playlist(p_broadcast_id uuid, p_workspace_id uuid, p_expected_updated_at timestamp with time zone, p_title text, p_description text, p_items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.replace_broadcast_playlist(p_broadcast_id uuid, p_workspace_id uuid, p_expected_updated_at timestamp with time zone, p_title text, p_description text, p_items jsonb) TO moc_app;
GRANT ALL ON FUNCTION public.replace_broadcast_playlist(p_broadcast_id uuid, p_workspace_id uuid, p_expected_updated_at timestamp with time zone, p_title text, p_description text, p_items jsonb) TO moc_worker;


--
-- Name: FUNCTION request_scheduled_resend(p_actor uuid, p_id uuid, p_revision integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_scheduled_resend(p_actor uuid, p_id uuid, p_revision integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_scheduled_resend(p_actor uuid, p_id uuid, p_revision integer) TO moc_worker;


--
-- Name: FUNCTION request_scheduled_send(p_actor uuid, p_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.request_scheduled_send(p_actor uuid, p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_scheduled_send(p_actor uuid, p_id uuid) TO moc_worker;


--
-- Name: FUNCTION reset_venue_booking_approval_on_reschedule(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reset_venue_booking_approval_on_reschedule() FROM PUBLIC;
GRANT ALL ON FUNCTION public.reset_venue_booking_approval_on_reschedule() TO moc_worker;


--
-- Name: FUNCTION respond_scheduled_attendance(p_actor uuid, p_id uuid, p_revision integer, p_status text, p_arrival text, p_group text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.respond_scheduled_attendance(p_actor uuid, p_id uuid, p_revision integer, p_status text, p_arrival text, p_group text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.respond_scheduled_attendance(p_actor uuid, p_id uuid, p_revision integer, p_status text, p_arrival text, p_group text) TO moc_worker;


--
-- Name: FUNCTION save_checklist_structure(p_checklist_id uuid, p_checklist jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_checklist_structure(p_checklist_id uuid, p_checklist jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_checklist_structure(p_checklist_id uuid, p_checklist jsonb) TO moc_app;
GRANT ALL ON FUNCTION public.save_checklist_structure(p_checklist_id uuid, p_checklist jsonb) TO moc_worker;


--
-- Name: FUNCTION save_integration_oauth_connection(p_provider text, p_workspace_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone, p_connection jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_integration_oauth_connection(p_provider text, p_workspace_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone, p_connection jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_integration_oauth_connection(p_provider text, p_workspace_id uuid, p_access_token text, p_refresh_token text, p_token_expires_at timestamp with time zone, p_connection jsonb) TO moc_worker;


--
-- Name: FUNCTION save_scheduled_template(p_actor uuid, p_workspace uuid, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_scheduled_template(p_actor uuid, p_workspace uuid, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_scheduled_template(p_actor uuid, p_workspace uuid, p_data jsonb) TO moc_worker;


--
-- Name: FUNCTION save_template_checklist_structure(p_checklist_template_id uuid, p_checklist jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_template_checklist_structure(p_checklist_template_id uuid, p_checklist jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_template_checklist_structure(p_checklist_template_id uuid, p_checklist jsonb) TO moc_app;
GRANT ALL ON FUNCTION public.save_template_checklist_structure(p_checklist_template_id uuid, p_checklist jsonb) TO moc_worker;


--
-- Name: FUNCTION set_booking_tracking_code(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_booking_tracking_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_booking_tracking_code() TO moc_worker;


--
-- Name: FUNCTION set_request_tracking_code(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_request_tracking_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_request_tracking_code() TO moc_worker;


--
-- Name: FUNCTION set_telegram_group_topics_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_telegram_group_topics_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_telegram_group_topics_updated_at() TO moc_worker;


--
-- Name: FUNCTION set_telegram_groups_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_telegram_groups_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_telegram_groups_updated_at() TO moc_worker;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_updated_at() TO moc_worker;


--
-- Name: FUNCTION set_workspace_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_workspace_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_workspace_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.set_workspace_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid) TO moc_worker;


--
-- Name: FUNCTION set_workspace_member_type(p_workspace_id uuid, p_user_id uuid, p_type_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_workspace_member_type(p_workspace_id uuid, p_user_id uuid, p_type_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_workspace_member_type(p_workspace_id uuid, p_user_id uuid, p_type_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.set_workspace_member_type(p_workspace_id uuid, p_user_id uuid, p_type_id uuid) TO moc_worker;


--
-- Name: FUNCTION stamp_booking_returned_at(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.stamp_booking_returned_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.stamp_booking_returned_at() TO moc_worker;


--
-- Name: FUNCTION sync_equipment_status_from_booking(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_equipment_status_from_booking() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_equipment_status_from_booking() TO moc_worker;


--
-- Name: FUNCTION sync_equipment_status_from_item(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_equipment_status_from_item() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_equipment_status_from_item() TO moc_worker;


--
-- Name: FUNCTION sync_venue_booking_slot_active(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.sync_venue_booking_slot_active() FROM PUBLIC;
GRANT ALL ON FUNCTION public.sync_venue_booking_slot_active() TO moc_worker;


--
-- Name: FUNCTION try_acquire_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_lock_expires_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.try_acquire_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_lock_expires_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.try_acquire_integration_oauth_refresh_lock(p_provider text, p_workspace_id uuid, p_expected_refresh_token text, p_lock_id uuid, p_lock_expires_at timestamp with time zone) TO moc_worker;


--
-- Name: FUNCTION venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) TO moc_public;
GRANT ALL ON FUNCTION public.venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) TO moc_app;
GRANT ALL ON FUNCTION public.venue_booking_phase(p_status public.venue_booking_status, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone) TO moc_worker;


--
-- Name: FUNCTION venue_slot_grid(p_workspace_id uuid, p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.venue_slot_grid(p_workspace_id uuid, p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.venue_slot_grid(p_workspace_id uuid, p_date date) TO moc_app;
GRANT ALL ON FUNCTION public.venue_slot_grid(p_workspace_id uuid, p_date date) TO moc_worker;


--
-- Name: FUNCTION workspace_timezone(p_workspace_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.workspace_timezone(p_workspace_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.workspace_timezone(p_workspace_id uuid) TO moc_app;
GRANT ALL ON FUNCTION public.workspace_timezone(p_workspace_id uuid) TO moc_worker;


--
-- Name: TABLE integration_oauth_tokens; Type: ACL; Schema: moc_private; Owner: -
--

GRANT ALL ON TABLE moc_private.integration_oauth_tokens TO moc_worker;


--
-- Name: TABLE api_rate_limit_windows; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.api_rate_limit_windows TO moc_worker;


--
-- Name: TABLE booking_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.booking_items TO moc_worker;
GRANT SELECT ON TABLE public.booking_items TO moc_app;


--
-- Name: TABLE broadcast_items; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.broadcast_items TO moc_public;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.broadcast_items TO moc_app;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.broadcast_items TO moc_worker;


--
-- Name: TABLE broadcasts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.broadcasts TO moc_public;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.broadcasts TO moc_app;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.broadcasts TO moc_worker;


--
-- Name: TABLE checklist_item_assignees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_item_assignees TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.checklist_item_assignees TO moc_app;


--
-- Name: TABLE checklist_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_items TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.checklist_items TO moc_app;


--
-- Name: TABLE checklist_sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_sections TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.checklist_sections TO moc_app;


--
-- Name: TABLE checklist_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_templates TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.checklist_templates TO moc_app;


--
-- Name: TABLE checklists; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklists TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.checklists TO moc_app;


--
-- Name: TABLE equipment; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.equipment TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.equipment TO moc_app;


--
-- Name: TABLE notification_deliveries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_deliveries TO moc_worker;


--
-- Name: TABLE notification_ingest_replays; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_ingest_replays TO moc_worker;


--
-- Name: TABLE notification_message_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_message_templates TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_message_templates TO moc_app;


--
-- Name: TABLE notification_outbox; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_outbox TO moc_worker;


--
-- Name: TABLE notification_routes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_routes TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_routes TO moc_app;


--
-- Name: TABLE notification_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notification_settings TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notification_settings TO moc_app;


--
-- Name: TABLE request_activity; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_activity TO moc_worker;
GRANT SELECT ON TABLE public.request_activity TO moc_app;


--
-- Name: TABLE request_assignees; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_assignees TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.request_assignees TO moc_app;


--
-- Name: TABLE request_categories; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE ON TABLE public.request_categories TO moc_app;
GRANT ALL ON TABLE public.request_categories TO moc_worker;


--
-- Name: COLUMN request_categories.name; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(name) ON TABLE public.request_categories TO moc_app;


--
-- Name: COLUMN request_categories.active; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(active) ON TABLE public.request_categories TO moc_app;


--
-- Name: COLUMN request_categories.sort_order; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(sort_order) ON TABLE public.request_categories TO moc_app;


--
-- Name: TABLE request_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.request_comments TO moc_worker;
GRANT SELECT,INSERT ON TABLE public.request_comments TO moc_app;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roles TO moc_worker;
GRANT SELECT ON TABLE public.roles TO moc_app;


--
-- Name: TABLE scheduled_message_occurrences; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_occurrences TO moc_worker;
GRANT SELECT ON TABLE public.scheduled_message_occurrences TO moc_app;


--
-- Name: TABLE scheduled_message_responses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_responses TO moc_worker;


--
-- Name: TABLE scheduled_message_schedules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_schedules TO moc_worker;
GRANT SELECT ON TABLE public.scheduled_message_schedules TO moc_app;


--
-- Name: TABLE scheduled_message_series_changes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_series_changes TO moc_worker;


--
-- Name: SEQUENCE scheduled_message_series_changes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.scheduled_message_series_changes_id_seq TO moc_worker;


--
-- Name: TABLE scheduled_message_sessions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_sessions TO moc_worker;


--
-- Name: TABLE scheduled_message_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scheduled_message_templates TO moc_worker;
GRANT SELECT ON TABLE public.scheduled_message_templates TO moc_app;


--
-- Name: TABLE streams; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.streams TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.streams TO moc_app;


--
-- Name: TABLE telegram_group_topics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.telegram_group_topics TO moc_worker;
GRANT SELECT ON TABLE public.telegram_group_topics TO moc_app;


--
-- Name: TABLE telegram_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.telegram_groups TO moc_worker;
GRANT SELECT,UPDATE ON TABLE public.telegram_groups TO moc_app;


--
-- Name: TABLE telegram_link_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.telegram_link_tokens TO moc_worker;
GRANT SELECT,INSERT,DELETE ON TABLE public.telegram_link_tokens TO moc_app;


--
-- Name: TABLE telegram_webhook_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.telegram_webhook_updates TO moc_worker;


--
-- Name: TABLE template_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.template_items TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.template_items TO moc_app;


--
-- Name: TABLE template_sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.template_sections TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.template_sections TO moc_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.users TO moc_worker;
GRANT SELECT,UPDATE ON TABLE public.users TO moc_app;


--
-- Name: TABLE venue_booking_slots; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.venue_booking_slots TO moc_app;
GRANT ALL ON TABLE public.venue_booking_slots TO moc_worker;


--
-- Name: TABLE venue_bookings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,DELETE,UPDATE ON TABLE public.venue_bookings TO moc_app;
GRANT ALL ON TABLE public.venue_bookings TO moc_worker;


--
-- Name: TABLE venue_events; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.venue_events TO moc_app;
GRANT ALL ON TABLE public.venue_events TO moc_worker;


--
-- Name: TABLE venues; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.venues TO moc_app;
GRANT ALL ON TABLE public.venues TO moc_worker;


--
-- Name: TABLE workspace_join_requests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.workspace_join_requests TO moc_worker;
GRANT SELECT ON TABLE public.workspace_join_requests TO moc_app;


--
-- Name: TABLE workspace_member_types; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.workspace_member_types TO moc_app;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workspace_member_types TO moc_worker;


--
-- Name: TABLE workspace_users; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.workspace_users TO moc_worker;
GRANT SELECT ON TABLE public.workspace_users TO moc_app;


--
-- Name: TABLE workspaces; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.workspaces TO moc_worker;
GRANT SELECT,UPDATE ON TABLE public.workspaces TO moc_app;


--
-- Name: TABLE youtube_connections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.youtube_connections TO moc_worker;
GRANT SELECT,UPDATE ON TABLE public.youtube_connections TO moc_app;


--
-- Name: TABLE zoom_connections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.zoom_connections TO moc_worker;
GRANT SELECT ON TABLE public.zoom_connections TO moc_app;


--
-- Name: TABLE zoom_meetings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.zoom_meetings TO moc_worker;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.zoom_meetings TO moc_app;


--
-- PostgreSQL database dump complete
--

-- Stable application defaults for a new workspace.
INSERT INTO public.roles (name, can_create, can_read, can_update, can_delete, can_manage_roles)
VALUES
  ('admin', true, true, true, true, true),
  ('editor', true, true, true, true, false),
  ('viewer', false, true, false, false, false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.workspaces (name, slug)
VALUES ('Default Workspace', 'default-workspace')
ON CONFLICT (slug) DO NOTHING;
