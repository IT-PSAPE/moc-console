BEGIN;

-- Tombstones keep schedules/occurrences intact while removing reusable templates.
ALTER TABLE public.scheduled_message_templates ADD COLUMN deleted_at timestamptz;
ALTER POLICY scheduled_templates_read ON public.scheduled_message_templates
 USING (deleted_at IS NULL AND private.current_user_can(workspace_id,'can_update'));

-- Template editing does not rewrite snapshots owned by existing schedules.
CREATE OR REPLACE FUNCTION public.save_scheduled_template(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE v_id uuid; v_type text:=p_data->>'messageType'; v_audience uuid[]; BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 IF v_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 PERFORM scheduled_validate_fields(v_type,p_data->'fields');
 SELECT coalesce(array_agg(value::uuid),'{}') INTO v_audience FROM jsonb_array_elements_text(coalesce(p_data->'audience','[]'));
 IF EXISTS(SELECT 1 FROM unnest(v_audience) a WHERE NOT EXISTS(SELECT 1 FROM workspace_member_types WHERE id=a AND workspace_id=p_workspace)) THEN RAISE EXCEPTION 'Invalid member type'; END IF;
 IF v_type='pre_attendance' AND cardinality(v_audience)=0 THEN RAISE EXCEPTION 'Select at least one member type'; END IF;
 IF p_data ? 'id' THEN
  UPDATE scheduled_message_templates SET name=p_data->>'name',message_type=v_type,body=p_data->>'body',fields=p_data->'fields',audience=v_audience,require_arrival=coalesce((p_data->>'requireArrival')::boolean,false)
  WHERE id=(p_data->>'id')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 ELSE
  INSERT INTO scheduled_message_templates(id,workspace_id,name,message_type,body,fields,audience,require_arrival)
  VALUES(coalesce((p_data->>'creationId')::uuid,gen_random_uuid()),p_workspace,p_data->>'name',v_type,p_data->>'body',p_data->'fields',v_audience,coalesce((p_data->>'requireArrival')::boolean,false))
  ON CONFLICT(id) DO UPDATE SET name=excluded.name,message_type=excluded.message_type,body=excluded.body,fields=excluded.fields,audience=excluded.audience,require_arrival=excluded.require_arrival
  WHERE scheduled_message_templates.workspace_id=p_workspace AND scheduled_message_templates.deleted_at IS NULL
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 END IF;
 RETURN v_id;
END $$;

CREATE FUNCTION public.delete_scheduled_template(p_actor uuid,p_workspace uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 UPDATE scheduled_message_templates SET deleted_at=coalesce(deleted_at,clock_timestamp())
 WHERE id=p_id AND workspace_id=p_workspace;
 IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
END $$;

-- Lock the template so deletion cannot race creation of a new schedule.
CREATE OR REPLACE FUNCTION public.create_scheduled_schedule(p_actor uuid,p_workspace uuid,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private,pg_temp AS $$
DECLARE t scheduled_message_templates; v_id uuid; v_fields jsonb; zone text:=coalesce(p_data->>'timezone','Africa/Johannesburg'); BEGIN
 IF NOT scheduled_actor_can(p_actor,p_workspace) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO t FROM scheduled_message_templates WHERE id=(p_data->>'templateId')::uuid AND workspace_id=p_workspace AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Template unavailable in this workspace'; END IF;
 IF p_data ? 'fields' AND jsonb_typeof(p_data->'fields') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Message fields must be an object'; END IF;
 v_fields:=t.fields || coalesce(p_data->'fields','{}'::jsonb);
 PERFORM scheduled_validate_fields(t.message_type,v_fields);
 PERFORM scheduled_validate_destination(p_workspace,p_data->>'groupChatId',(p_data->>'threadId')::bigint);
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
 IF coalesce((p_data->>'autoSend')::boolean,true) AND coalesce((p_data->>'expiryHours')::integer,72)<24 THEN RAISE EXCEPTION 'Automatic schedules need at least 24 expiry hours for the daily worker; use manual delivery for shorter windows'; END IF;
 INSERT INTO scheduled_message_schedules(workspace_id,template_id,group_chat_id,thread_id,starts_on,until_on,timezone,frequency,auto_send,expiry_hours,fields,body,message_type,audience,require_arrival)
 VALUES(p_workspace,t.id,p_data->>'groupChatId',(p_data->>'threadId')::bigint,(p_data->>'startsOn')::date,(p_data->>'untilOn')::date,zone,p_data->>'frequency',coalesce((p_data->>'autoSend')::boolean,true),coalesce((p_data->>'expiryHours')::integer,72),v_fields,t.body,t.message_type,t.audience,t.require_arrival) RETURNING id INTO v_id;
 PERFORM materialize_scheduled_messages(v_id);
 RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.save_scheduled_template(uuid,uuid,jsonb),public.create_scheduled_schedule(uuid,uuid,jsonb),public.delete_scheduled_template(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_scheduled_template(uuid,uuid,jsonb),public.create_scheduled_schedule(uuid,uuid,jsonb),public.delete_scheduled_template(uuid,uuid,uuid) TO service_role;
COMMIT;
