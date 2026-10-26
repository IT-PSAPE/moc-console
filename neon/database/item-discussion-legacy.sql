\ir item-discussion-text.sql
CREATE TABLE IF NOT EXISTS moc_private.request_discussion_backup (
 request_id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL,
 notes text,
 content text,
 request_created_at timestamptz NOT NULL,
 request_updated_at timestamptz NOT NULL,
 backed_up_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON moc_private.request_discussion_backup FROM PUBLIC,moc_app,moc_public,moc_worker;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='requests' AND column_name='notes') THEN
  EXECUTE 'INSERT INTO moc_private.request_discussion_backup(request_id,workspace_id,notes,content,request_created_at,request_updated_at)
   SELECT id,workspace_id,notes,content,created_at,updated_at FROM public.requests
   WHERE nullif(btrim(notes),'''') IS NOT NULL OR nullif(btrim(content),'''') IS NOT NULL ON CONFLICT DO NOTHING';
 END IF;
 IF to_regclass('public.request_activity') IS NOT NULL THEN
  EXECUTE $migration$
   INSERT INTO public.item_activity(id,workspace_id,item_kind,item_id,actor_id,actor_kind,actor_name,event_type,changes,details,created_at)
   SELECT history.id,requests.workspace_id,'request',history.request_id,history.actor_id,
    CASE WHEN history.actor_id IS NOT NULL THEN 'member' WHEN history.event_type='created' AND history.details ? 'requester_name' THEN 'requester' ELSE 'unknown' END,
    CASE WHEN history.actor_id IS NOT NULL THEN nullif(btrim(concat_ws(' ',users.name,users.surname)),'')
     WHEN history.event_type='created' THEN history.details->>'requester_name' END,
    history.event_type,
    CASE WHEN history.event_type='title_updated' THEN jsonb_build_array(jsonb_build_object('field','title','before',history.details->'from_title','after',history.details->'to_title'))
     WHEN history.event_type='status_changed' THEN jsonb_build_array(jsonb_build_object('field','status','before',history.details->'from_status','after',history.details->'to_status')) ELSE '[]' END,
    history.details,history.created_at
   FROM public.request_activity history JOIN public.requests ON requests.id=history.request_id LEFT JOIN public.users ON users.id=history.actor_id ON CONFLICT DO NOTHING
  $migration$;
 END IF;
 IF to_regclass('public.request_comments') IS NOT NULL THEN
  EXECUTE $migration$
   INSERT INTO public.item_comments(id,workspace_id,item_kind,item_id,actor_id,actor_kind,actor_name,body,created_at)
   SELECT history.id,requests.workspace_id,'request',history.request_id,history.actor_id,
    CASE WHEN history.actor_id IS NOT NULL THEN 'member' ELSE 'unknown' END,nullif(btrim(concat_ws(' ',users.name,users.surname)),''),history.body,history.created_at
   FROM public.request_comments history JOIN public.requests ON requests.id=history.request_id LEFT JOIN public.users ON users.id=history.actor_id ON CONFLICT DO NOTHING
  $migration$;
 END IF;
END $$;
INSERT INTO public.item_comments(id,workspace_id,item_kind,item_id,actor_kind,body,origin)
SELECT md5(backup.request_id::text||':'||legacy.origin)::uuid,backup.workspace_id,'request',backup.request_id,'unknown',
 CASE WHEN legacy.origin='legacy-note' THEN legacy.payload ELSE moc_private.discussion_plain_text(legacy.payload) END,legacy.origin
FROM moc_private.request_discussion_backup backup
CROSS JOIN LATERAL (VALUES ('legacy-note',backup.notes),('legacy-content',backup.content)) legacy(origin,payload)
WHERE nullif(btrim(legacy.payload),'') IS NOT NULL
ON CONFLICT DO NOTHING;
-- Fail closed before dropping source fields if any non-empty value is missing.
DO $$ DECLARE incomplete boolean; BEGIN
 IF EXISTS (
  SELECT 1 FROM moc_private.request_discussion_backup backup
  CROSS JOIN LATERAL (VALUES ('legacy-note',backup.notes),('legacy-content',backup.content)) legacy(origin,payload)
  LEFT JOIN public.item_comments comments ON comments.id=md5(backup.request_id::text||':'||legacy.origin)::uuid
   AND comments.item_id=backup.request_id AND comments.workspace_id=backup.workspace_id AND comments.origin=legacy.origin
   AND comments.body=CASE WHEN legacy.origin='legacy-note' THEN legacy.payload ELSE moc_private.discussion_plain_text(legacy.payload) END
  WHERE nullif(btrim(legacy.payload),'') IS NOT NULL AND comments.id IS NULL
 ) THEN RAISE EXCEPTION 'Request content migration is incomplete'; END IF;
 IF to_regclass('public.request_activity') IS NOT NULL THEN
  EXECUTE $parity$
   SELECT EXISTS(SELECT 1 FROM public.request_activity legacy JOIN public.requests ON requests.id=legacy.request_id
    LEFT JOIN public.item_activity current ON current.id=legacy.id AND current.workspace_id=requests.workspace_id
     AND current.item_kind='request' AND current.item_id=legacy.request_id AND current.actor_id IS NOT DISTINCT FROM legacy.actor_id
     AND current.event_type=legacy.event_type AND current.details=legacy.details AND current.created_at=legacy.created_at
    WHERE current.id IS NULL)
  $parity$ INTO incomplete;
  IF incomplete THEN RAISE EXCEPTION 'Legacy request activity migration parity failed'; END IF;
 END IF;
 IF to_regclass('public.request_comments') IS NOT NULL THEN
  EXECUTE $parity$
   SELECT EXISTS(SELECT 1 FROM public.request_comments legacy JOIN public.requests ON requests.id=legacy.request_id
    LEFT JOIN public.item_comments current ON current.id=legacy.id AND current.workspace_id=requests.workspace_id
     AND current.item_kind='request' AND current.item_id=legacy.request_id AND current.actor_id IS NOT DISTINCT FROM legacy.actor_id
     AND current.body=legacy.body AND current.created_at=legacy.created_at
    WHERE current.id IS NULL)
  $parity$ INTO incomplete;
  IF incomplete THEN RAISE EXCEPTION 'Legacy request comment migration parity failed'; END IF;
 END IF;
END $$;
DROP TABLE IF EXISTS public.request_activity;
DROP TABLE IF EXISTS public.request_comments;
DROP FUNCTION IF EXISTS public.record_request_activity();
ALTER TABLE public.requests DROP COLUMN IF EXISTS notes;
ALTER TABLE public.requests DROP COLUMN IF EXISTS content;

-- Preserve customized request notification text while replacing its obsolete
-- request-note token with the existing request description field.
UPDATE public.notification_message_templates SET body=replace(body,'{{notes}}','{{what}}'),updated_at=now()
WHERE message_type IN ('request.created','assignment.request') AND body LIKE '%{{notes}}%';
