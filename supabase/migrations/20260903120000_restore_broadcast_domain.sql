-- Reintroduce the Broadcast authoring and public playback domain as a
-- workspace-scoped playlist model with anonymous read only for published
-- broadcasts. Broadcast media lives in its own public bucket so the separate
-- public player app can stream files without signed URLs.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'broadcast_kind'
  ) THEN
    CREATE TYPE public.broadcast_kind AS ENUM ('audio', 'video');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id            uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid                   NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by    uuid                   NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title         text                   NOT NULL,
  description   text                   NOT NULL DEFAULT '',
  slug          text                   NOT NULL UNIQUE,
  kind          public.broadcast_kind  NOT NULL,
  is_published  boolean                NOT NULL DEFAULT false,
  loop_enabled  boolean                NOT NULL DEFAULT true,
  preload_count integer                NOT NULL DEFAULT 1 CHECK (preload_count BETWEEN 1 AND 3),
  created_at    timestamptz            NOT NULL DEFAULT now(),
  updated_at    timestamptz            NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_items (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id     uuid         NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  title            text         NOT NULL,
  sort_order       integer      NOT NULL,
  storage_bucket   text         NOT NULL DEFAULT 'broadcast-media',
  storage_path     text         NOT NULL,
  public_url       text         NOT NULL,
  mime_type        text         NOT NULL,
  file_size_bytes  bigint       NOT NULL CHECK (file_size_bytes >= 0),
  duration_seconds numeric      NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  created_at       timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_workspace_id ON public.broadcasts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_workspace_id_kind ON public.broadcasts (workspace_id, kind);
CREATE INDEX IF NOT EXISTS idx_broadcast_items_broadcast_id_sort_order ON public.broadcast_items (broadcast_id, sort_order);

DROP TRIGGER IF EXISTS set_broadcasts_updated_at ON public.broadcasts;
CREATE TRIGGER set_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broadcasts_select" ON public.broadcasts;
CREATE POLICY "broadcasts_select" ON public.broadcasts
  FOR SELECT TO authenticated
  USING (private.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "broadcasts_insert" ON public.broadcasts;
CREATE POLICY "broadcasts_insert" ON public.broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (private.current_user_can(workspace_id, 'can_create'));

DROP POLICY IF EXISTS "broadcasts_update" ON public.broadcasts;
CREATE POLICY "broadcasts_update" ON public.broadcasts
  FOR UPDATE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_update'))
  WITH CHECK (private.current_user_can(workspace_id, 'can_update'));

DROP POLICY IF EXISTS "broadcasts_delete" ON public.broadcasts;
CREATE POLICY "broadcasts_delete" ON public.broadcasts
  FOR DELETE TO authenticated
  USING (private.current_user_can(workspace_id, 'can_delete'));

DROP POLICY IF EXISTS "broadcasts_public_select" ON public.broadcasts;
CREATE POLICY "broadcasts_public_select" ON public.broadcasts
  FOR SELECT TO anon, authenticated
  USING (is_published);

DROP POLICY IF EXISTS "broadcast_items_select" ON public.broadcast_items;
CREATE POLICY "broadcast_items_select" ON public.broadcast_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND private.is_workspace_member(broadcasts.workspace_id)
    )
  );

DROP POLICY IF EXISTS "broadcast_items_insert" ON public.broadcast_items;
CREATE POLICY "broadcast_items_insert" ON public.broadcast_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND private.current_user_can(broadcasts.workspace_id, 'can_create')
    )
  );

DROP POLICY IF EXISTS "broadcast_items_update" ON public.broadcast_items;
CREATE POLICY "broadcast_items_update" ON public.broadcast_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND private.current_user_can(broadcasts.workspace_id, 'can_update')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND private.current_user_can(broadcasts.workspace_id, 'can_update')
    )
  );

DROP POLICY IF EXISTS "broadcast_items_delete" ON public.broadcast_items;
CREATE POLICY "broadcast_items_delete" ON public.broadcast_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND private.current_user_can(broadcasts.workspace_id, 'can_delete')
    )
  );

DROP POLICY IF EXISTS "broadcast_items_public_select" ON public.broadcast_items;
CREATE POLICY "broadcast_items_public_select" ON public.broadcast_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND broadcasts.is_published
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcast-media', 'broadcast-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "broadcast_media_bucket_public_read" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'broadcast-media');

DROP POLICY IF EXISTS "broadcast_media_bucket_insert" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'broadcast-media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_create')
  );

DROP POLICY IF EXISTS "broadcast_media_bucket_update" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'broadcast-media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_update')
  )
  WITH CHECK (
    bucket_id = 'broadcast-media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_update')
  );

DROP POLICY IF EXISTS "broadcast_media_bucket_delete" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'broadcast-media'
    AND private.current_user_can(private.storage_object_workspace_id(name), 'can_delete')
  );

COMMIT;
