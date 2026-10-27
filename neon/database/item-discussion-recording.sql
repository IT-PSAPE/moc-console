-- Only explicitly listed fields enter audit snapshots. Provider credentials,
-- passwords, URLs containing credentials, delivery errors and leases never do.
CREATE OR REPLACE FUNCTION moc_private.item_changes(p_before jsonb,p_after jsonb,p_fields text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('field',field,'before',p_before->field,'after',p_after->field) ORDER BY position),'[]'::jsonb)
 FROM unnest(p_fields) WITH ORDINALITY AS fields(field,position)
 WHERE p_before->field IS DISTINCT FROM p_after->field;
$$;
CREATE OR REPLACE FUNCTION moc_private.append_item_activity(
 p_workspace uuid,p_kind text,p_item uuid,p_event text,p_changes jsonb DEFAULT '[]',p_details jsonb DEFAULT '{}',p_requester text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE selected_role text := current_setting('role',true); actor uuid; kind text := 'unknown'; name text;
BEGIN
 -- Cascading workspace removal also removes its audit rows. Do not recreate
 -- rows referencing the workspace after its own DELETE has taken effect.
 IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id=p_workspace) THEN RETURN; END IF;
 IF selected_role IN ('moc_app','moc_worker') THEN
  actor := moc_private.actor_id();
  IF actor IS NOT NULL THEN
   kind := 'member';
   SELECT nullif(btrim(concat_ws(' ',users.name,users.surname)),'') INTO name FROM public.users WHERE id=actor;
  ELSIF selected_role='moc_worker' THEN
   kind := CASE WHEN current_setting('moc.actor_kind',true) IN ('integration','system') THEN current_setting('moc.actor_kind',true) ELSE 'system' END;
   name := nullif(current_setting('moc.actor_name',true),'');
  END IF;
 ELSIF selected_role='moc_public' THEN kind := 'requester'; name := nullif(btrim(p_requester),'');
 END IF;
 INSERT INTO public.item_activity(workspace_id,item_kind,item_id,actor_id,actor_kind,actor_name,event_type,changes,details,operation_id)
 VALUES(p_workspace,p_kind,p_item,actor,kind,name,p_event,p_changes,p_details,txid_current()::text);
END $$;
REVOKE ALL ON FUNCTION moc_private.item_changes(jsonb,jsonb,text[]) FROM PUBLIC,moc_app,moc_public,moc_worker;
REVOKE ALL ON FUNCTION moc_private.append_item_activity(uuid,text,uuid,text,jsonb,jsonb,text) FROM PUBLIC,moc_app,moc_public,moc_worker;

CREATE OR REPLACE FUNCTION moc_private.record_item_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE before_row jsonb := CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}' END;
 after_row jsonb := CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}' END;
 item_row jsonb := CASE WHEN TG_OP='DELETE' THEN before_row ELSE after_row END;
 fields text[] := string_to_array(TG_ARGV[1],','); changes jsonb; event text; details jsonb := '{}';
 old_request uuid := (before_row->>'request_id')::uuid; new_request uuid := (after_row->>'request_id')::uuid;
 requester text := coalesce(item_row->>'requested_by',item_row->>'booked_by');
BEGIN
 changes := moc_private.item_changes(before_row,after_row,fields);
 IF TG_OP='UPDATE' AND changes='[]'::jsonb THEN RETURN NEW; END IF;
 event := CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'DELETE' THEN 'deleted' ELSE 'updated' END;
 IF TG_OP='DELETE' THEN
  SELECT jsonb_build_object('snapshot',jsonb_object_agg(field,before_row->field)) INTO details FROM unnest(fields) AS fields(field) WHERE before_row ? field;
  details := details || moc_private.item_child_snapshot(TG_ARGV[0],(item_row->>'id')::uuid);
 ELSIF TG_OP='INSERT' AND requester IS NOT NULL THEN details := jsonb_build_object('requester_name',requester);
 END IF;
 PERFORM moc_private.append_item_activity((item_row->>'workspace_id')::uuid,TG_ARGV[0],(item_row->>'id')::uuid,event,
  CASE WHEN TG_OP='UPDATE' THEN changes ELSE '[]'::jsonb END,
  details,requester);
 IF old_request IS DISTINCT FROM new_request THEN
  IF old_request IS NOT NULL THEN
   PERFORM moc_private.append_item_activity((before_row->>'workspace_id')::uuid,'request',old_request,'work_unlinked','[]',
    jsonb_build_object('item_kind',TG_ARGV[0],'item_id',item_row->>'id','label',coalesce(item_row->>'title',item_row->>'name',item_row->>'topic')),requester);
  END IF;
  IF new_request IS NOT NULL THEN
   PERFORM moc_private.append_item_activity((after_row->>'workspace_id')::uuid,'request',new_request,'work_linked','[]',
    jsonb_build_object('item_kind',TG_ARGV[0],'item_id',item_row->>'id','label',coalesce(item_row->>'title',item_row->>'name',item_row->>'topic')),requester);
  END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION moc_private.record_item_activity() FROM PUBLIC,moc_app,moc_public,moc_worker;
