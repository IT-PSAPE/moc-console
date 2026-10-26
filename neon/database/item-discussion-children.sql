-- Capture only safe child fields before a root deletion cascades. The snapshot
-- remains inaccessible through RLS once its parent no longer exists.
CREATE OR REPLACE FUNCTION moc_private.item_child_snapshot(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE children jsonb;
BEGIN
 CASE p_kind
 WHEN 'request' THEN SELECT jsonb_agg(jsonb_build_object('id',id,'user_id',user_id,'duty',duty)) INTO children FROM public.request_assignees WHERE request_id=p_id;
 WHEN 'booking' THEN SELECT jsonb_agg(jsonb_build_object('id',id,'equipment_id',equipment_id)) INTO children FROM public.booking_items WHERE booking_id=p_id;
 WHEN 'checklist' THEN SELECT jsonb_agg(jsonb_build_object('id',items.id,'label',label,'checked',checked,'assignees',
  (SELECT jsonb_agg(user_id) FROM public.checklist_item_assignees WHERE checklist_item_id=items.id))) INTO children FROM public.checklist_items items WHERE checklist_id=p_id;
 WHEN 'broadcast' THEN SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'sort_order',sort_order)) INTO children FROM public.broadcast_items WHERE broadcast_id=p_id;
 ELSE RETURN '{}';
 END CASE;
 RETURN jsonb_build_object('children',coalesce(children,'[]'));
END $$;
REVOKE ALL ON FUNCTION moc_private.item_child_snapshot(text,uuid) FROM PUBLIC,moc_app,moc_public,moc_worker;

CREATE OR REPLACE FUNCTION moc_private.record_item_child_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE before_row jsonb := CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) ELSE '{}' END;
 after_row jsonb := CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) ELSE '{}' END;
 child jsonb := CASE WHEN TG_OP='DELETE' THEN before_row ELSE after_row END;
 parent_row jsonb; previous_parent_row jsonb; parent uuid; workspace uuid; kind text := TG_ARGV[0];
 action text := TG_ARGV[3]; changes jsonb; details jsonb; label text; before_label text; after_label text;
BEGIN
 parent := (child->>TG_ARGV[1])::uuid;
 IF TG_TABLE_NAME='checklist_item_assignees' THEN
  SELECT to_jsonb(checklists),checklist_items.label INTO parent_row,label
  FROM public.checklist_items JOIN public.checklists ON checklists.id=checklist_items.checklist_id
  WHERE checklist_items.id=parent;
 ELSE
  EXECUTE format('SELECT to_jsonb(parent) FROM public.%I parent WHERE id=$1',TG_ARGV[2]) INTO parent_row USING parent;
 END IF;
 -- Root deletion stores child snapshots before cascades remove the parent.
 IF parent_row IS NULL THEN RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END IF;
 parent := (parent_row->>'id')::uuid; workspace := (parent_row->>'workspace_id')::uuid;
 -- The structure RPC can reuse an item in another authorized checklist.
 -- Record each side before the ordinary no-op guard considers safe fields.
 IF TG_TABLE_NAME='checklist_items' AND TG_OP='UPDATE'
  AND before_row->>'checklist_id' IS DISTINCT FROM after_row->>'checklist_id' THEN
  SELECT to_jsonb(checklists) INTO previous_parent_row FROM public.checklists WHERE id=(before_row->>'checklist_id')::uuid;
  IF previous_parent_row IS NOT NULL THEN
   PERFORM moc_private.append_item_activity((previous_parent_row->>'workspace_id')::uuid,kind,(previous_parent_row->>'id')::uuid,'item_removed',
    moc_private.item_changes(before_row,'{}',string_to_array(TG_ARGV[4],',')),
    jsonb_build_object('child_id',child->>'id','label',before_row->>'label','moved_to',parent));
  END IF;
  PERFORM moc_private.append_item_activity(workspace,kind,parent,'item_added',
   moc_private.item_changes('{}',after_row,string_to_array(TG_ARGV[4],',')),
   jsonb_build_object('child_id',child->>'id','label',after_row->>'label','moved_from',before_row->>'checklist_id'));
  RETURN NEW;
 END IF;
 changes := moc_private.item_changes(before_row,after_row,string_to_array(TG_ARGV[4],','));
 IF TG_OP='UPDATE' AND changes='[]'::jsonb THEN RETURN NEW; END IF;
 action := action || CASE TG_OP WHEN 'INSERT' THEN '_added' WHEN 'DELETE' THEN '_removed' ELSE '_updated' END;
 IF TG_TABLE_NAME='checklist_items' AND TG_OP='UPDATE' AND before_row->'checked' IS DISTINCT FROM after_row->'checked' THEN
  action := CASE WHEN NEW.checked THEN 'item_completed' ELSE 'item_reopened' END;
 END IF;
 label := coalesce(label,child->>'label',child->>'title',child->>'name');
 IF child ? 'user_id' THEN
  SELECT nullif(btrim(concat_ws(' ',users.name,users.surname)),'') INTO before_label
  FROM public.users JOIN public.workspace_users member ON member.user_id=users.id
  WHERE users.id=(before_row->>'user_id')::uuid AND member.workspace_id=workspace;
  SELECT nullif(btrim(concat_ws(' ',users.name,users.surname)),'') INTO after_label
  FROM public.users JOIN public.workspace_users member ON member.user_id=users.id
  WHERE users.id=(after_row->>'user_id')::uuid AND member.workspace_id=workspace;
  label := coalesce(after_label,before_label);
 ELSIF child ? 'equipment_id' THEN
  SELECT name INTO before_label FROM public.equipment WHERE id=(before_row->>'equipment_id')::uuid AND workspace_id=workspace;
  SELECT name INTO after_label FROM public.equipment WHERE id=(after_row->>'equipment_id')::uuid AND workspace_id=workspace;
  label := coalesce(after_label,before_label);
 END IF;
 details := jsonb_strip_nulls(jsonb_build_object('child_id',child->>'id','label',label,
  'before_label',before_label,'after_label',after_label,
  'user_id',child->>'user_id','equipment_id',child->>'equipment_id','duty',child->>'duty'));
 PERFORM moc_private.append_item_activity(workspace,kind,parent,action,changes,details,coalesce(parent_row->>'requested_by',parent_row->>'booked_by'));
 IF TG_TABLE_NAME='booking_items' AND EXISTS (SELECT 1 FROM public.equipment WHERE id=(child->>'equipment_id')::uuid AND workspace_id=workspace) THEN
  PERFORM moc_private.append_item_activity(workspace,'equipment',(child->>'equipment_id')::uuid,action,'[]',
   jsonb_build_object('booking_id',parent,'label',parent_row->>'title'),parent_row->>'booked_by');
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION moc_private.record_item_child_activity() FROM PUBLIC,moc_app,moc_public,moc_worker;
DO $$ DECLARE spec record;
BEGIN
 FOR spec IN SELECT * FROM (VALUES
  ('request_assignees','request','request_id','requests','assignee','user_id,duty'),
  ('booking_items','booking','booking_id','bookings','equipment','equipment_id'),
  ('checklist_items','checklist','checklist_id','checklists','item','label,checked,sort_order,section_id'),
  ('checklist_sections','checklist','checklist_id','checklists','section','name,sort_order'),
  ('checklist_item_assignees','checklist','checklist_item_id','checklists','assignee','user_id'),
  ('broadcast_items','broadcast','broadcast_id','broadcasts','media','title,sort_order,mime_type,file_size_bytes,duration_seconds')
 ) AS specs(relation_name,kind,parent_field,parent_relation,action,fields) LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS record_item_child_activity ON public.%I',spec.relation_name);
  EXECUTE format('CREATE TRIGGER record_item_child_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION moc_private.record_item_child_activity(%L,%L,%L,%L,%L)',spec.relation_name,spec.kind,spec.parent_field,spec.parent_relation,spec.action,spec.fields);
 END LOOP;
END $$;
