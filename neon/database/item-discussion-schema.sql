CREATE TABLE IF NOT EXISTS public.item_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('request','equipment','booking','venue-booking','checklist','stream','meeting','broadcast','scheduled-message')),
  item_id uuid NOT NULL,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'unknown' CHECK (actor_kind IN ('member','requester','integration','system','unknown')),
  actor_name text,
  event_type text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(changes)='array'),
  details jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(details)='object'),
  operation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('request','equipment','booking','venue-booking','checklist','stream','meeting','broadcast','scheduled-message')),
  item_id uuid NOT NULL,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'unknown' CHECK (actor_kind IN ('member','requester','integration','system','unknown')),
  actor_name text,
  body text NOT NULL CHECK (length(btrim(body))>0),
  origin text NOT NULL DEFAULT 'comment' CHECK (origin IN ('comment','legacy-note','legacy-content')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_activity_item_created_idx ON public.item_activity(workspace_id,item_kind,item_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS item_comments_item_created_idx ON public.item_comments(workspace_id,item_kind,item_id,created_at DESC,id DESC);

CREATE OR REPLACE FUNCTION moc_private.can_access_item(p_workspace uuid,p_kind text,p_item uuid,p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE relation_name text; allowed boolean;
BEGIN
 IF p_workspace IS DISTINCT FROM nullif(current_setting('moc.workspace_id',true),'')::uuid
   OR NOT moc_private.is_workspace_member(p_workspace) THEN RETURN false; END IF;
 relation_name := CASE p_kind WHEN 'request' THEN 'requests' WHEN 'equipment' THEN 'equipment'
  WHEN 'booking' THEN 'bookings' WHEN 'venue-booking' THEN 'venue_bookings' WHEN 'checklist' THEN 'checklists'
  WHEN 'stream' THEN 'streams' WHEN 'meeting' THEN 'zoom_meetings' WHEN 'broadcast' THEN 'broadcasts'
  WHEN 'scheduled-message' THEN 'scheduled_message_occurrences' END;
 IF relation_name IS NULL THEN RETURN false; END IF;
 IF (p_write OR p_kind='scheduled-message') AND NOT moc_private.current_user_can(p_workspace,'can_update') THEN RETURN false; END IF;
 IF NOT p_write AND p_kind<>'scheduled-message' AND NOT moc_private.current_user_can(p_workspace,'can_read') THEN RETURN false; END IF;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE workspace_id=$1 AND id=$2)',relation_name)
 INTO allowed USING p_workspace,p_item;
 RETURN allowed;
END $$;
REVOKE ALL ON FUNCTION moc_private.can_access_item(uuid,text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moc_private.can_access_item(uuid,text,uuid,boolean) TO moc_app;

CREATE OR REPLACE FUNCTION moc_private.prepare_item_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF current_setting('role',true)='moc_app' THEN
  IF NEW.actor_id IS DISTINCT FROM moc_private.actor_id() OR NEW.actor_kind<>'member' OR NEW.origin<>'comment' THEN
   RAISE EXCEPTION 'Comment provenance must match the authenticated member' USING ERRCODE='42501';
  END IF;
  SELECT nullif(btrim(concat_ws(' ',name,surname)),'') INTO NEW.actor_name FROM public.users WHERE id=NEW.actor_id;
  NEW.created_at := now();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION moc_private.prepare_item_comment() FROM PUBLIC,moc_app,moc_public,moc_worker;
DROP TRIGGER IF EXISTS prepare_item_comment ON public.item_comments;
CREATE TRIGGER prepare_item_comment BEFORE INSERT ON public.item_comments FOR EACH ROW EXECUTE FUNCTION moc_private.prepare_item_comment();
ALTER TABLE public.item_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS item_activity_select ON public.item_activity;
CREATE POLICY item_activity_select ON public.item_activity FOR SELECT TO moc_app USING (moc_private.can_access_item(workspace_id,item_kind,item_id));
DROP POLICY IF EXISTS item_comments_select ON public.item_comments;
CREATE POLICY item_comments_select ON public.item_comments FOR SELECT TO moc_app USING (moc_private.can_access_item(workspace_id,item_kind,item_id));
DROP POLICY IF EXISTS item_comments_insert ON public.item_comments;
CREATE POLICY item_comments_insert ON public.item_comments FOR INSERT TO moc_app WITH CHECK (
 actor_id=moc_private.actor_id() AND actor_kind='member' AND origin='comment' AND moc_private.can_access_item(workspace_id,item_kind,item_id,true));
REVOKE ALL ON public.item_activity,public.item_comments FROM PUBLIC,moc_app,moc_public,moc_worker;
GRANT SELECT ON public.item_activity,public.item_comments TO moc_app,moc_worker;
GRANT INSERT ON public.item_comments TO moc_app;
