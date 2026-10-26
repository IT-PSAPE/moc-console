-- Keep exact original text and source timestamps owner-only before removing
-- note columns. No author was recorded for these fields, so do not infer one.
CREATE TABLE IF NOT EXISTS moc_private.item_notes_backup (
 item_kind text NOT NULL,
 item_id uuid NOT NULL,
 workspace_id uuid NOT NULL,
 body text NOT NULL,
 source_created_at timestamptz,
 source_updated_at timestamptz,
 backed_up_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(item_kind,item_id)
);
REVOKE ALL ON moc_private.item_notes_backup FROM PUBLIC,moc_app,moc_public,moc_worker;
DO $$ DECLARE spec record; incomplete boolean;
BEGIN
 FOR spec IN SELECT * FROM (VALUES ('equipment','equipment'),('bookings','booking'),('venue_bookings','venue-booking')) kinds(relation_name,kind) LOOP
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=spec.relation_name AND column_name='notes') THEN
   EXECUTE format($backup$
    INSERT INTO moc_private.item_notes_backup(item_kind,item_id,workspace_id,body,source_created_at,source_updated_at)
    SELECT %L,id,workspace_id,notes,(to_jsonb(source)->>'created_at')::timestamptz,(to_jsonb(source)->>'updated_at')::timestamptz
    FROM public.%I source WHERE nullif(btrim(notes),'') IS NOT NULL ON CONFLICT DO NOTHING
   $backup$,spec.kind,spec.relation_name);
   EXECUTE format($parity$
    SELECT EXISTS(SELECT 1 FROM public.%I source LEFT JOIN moc_private.item_notes_backup backup
     ON backup.item_kind=%L AND backup.item_id=source.id AND backup.workspace_id=source.workspace_id AND backup.body=source.notes
     AND backup.source_created_at IS NOT DISTINCT FROM (to_jsonb(source)->>'created_at')::timestamptz
     AND backup.source_updated_at IS NOT DISTINCT FROM (to_jsonb(source)->>'updated_at')::timestamptz
     WHERE nullif(btrim(source.notes),'') IS NOT NULL AND backup.item_id IS NULL)
   $parity$,spec.relation_name,spec.kind) INTO incomplete;
   IF incomplete THEN RAISE EXCEPTION 'Original % notes backup parity failed',spec.kind; END IF;
  END IF;
 END LOOP;
END $$;
INSERT INTO public.item_comments(id,workspace_id,item_kind,item_id,actor_kind,body,origin,created_at)
SELECT md5(item_kind||':'||item_id::text||':legacy-note')::uuid,workspace_id,item_kind,item_id,'unknown',body,'legacy-note',
 backed_up_at FROM moc_private.item_notes_backup
ON CONFLICT DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM moc_private.item_notes_backup backup LEFT JOIN public.item_comments comments
  ON comments.id=md5(backup.item_kind||':'||backup.item_id::text||':legacy-note')::uuid
   AND comments.workspace_id=backup.workspace_id AND comments.item_kind=backup.item_kind AND comments.item_id=backup.item_id
   AND comments.body=backup.body AND comments.origin='legacy-note' AND comments.actor_id IS NULL AND comments.actor_kind='unknown'
   AND comments.created_at=backup.backed_up_at
  WHERE comments.id IS NULL) THEN RAISE EXCEPTION 'Item notes comment migration parity failed'; END IF;
END $$;
ALTER TABLE public.equipment DROP COLUMN IF EXISTS notes;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS notes;
ALTER TABLE public.venue_bookings DROP COLUMN IF EXISTS notes;
-- Keep customized notification bodies while retiring their obsolete token.
UPDATE public.notification_message_templates
SET body=regexp_replace(replace(body,'{{notes}}',''),'<blockquote>\s*</blockquote>','','gi'),updated_at=now()
WHERE message_type IN ('booking.created','venue_booking.created') AND body LIKE '%{{notes}}%';
