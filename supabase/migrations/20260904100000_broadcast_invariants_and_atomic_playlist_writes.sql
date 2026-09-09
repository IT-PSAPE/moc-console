-- Make broadcast visibility and playback behavior system invariants, publish
-- playlist changes to Realtime, and make broadcast row mutations atomic.

BEGIN;

DROP POLICY IF EXISTS "broadcasts_public_select" ON public.broadcasts;
DROP POLICY IF EXISTS "broadcast_items_public_select" ON public.broadcast_items;

ALTER TABLE public.broadcasts
  DROP COLUMN IF EXISTS is_published,
  DROP COLUMN IF EXISTS loop_enabled,
  DROP COLUMN IF EXISTS preload_count;

CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON public.broadcasts (created_by);

ALTER TABLE public.broadcasts REPLICA IDENTITY FULL;
ALTER TABLE public.broadcast_items REPLICA IDENTITY FULL;

GRANT SELECT ON TABLE public.broadcasts, public.broadcast_items TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.broadcasts, public.broadcast_items FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.broadcasts, public.broadcast_items TO service_role;

CREATE POLICY "broadcasts_public_select" ON public.broadcasts
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "broadcast_items_insert" ON public.broadcast_items;
CREATE POLICY "broadcast_items_insert" ON public.broadcast_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
        AND (
          private.current_user_can(broadcasts.workspace_id, 'can_create')
          OR private.current_user_can(broadcasts.workspace_id, 'can_update')
        )
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
        AND (
          private.current_user_can(broadcasts.workspace_id, 'can_delete')
          OR private.current_user_can(broadcasts.workspace_id, 'can_update')
        )
    )
  );

CREATE POLICY "broadcast_items_public_select" ON public.broadcast_items
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.broadcasts
      WHERE broadcasts.id = broadcast_items.broadcast_id
    )
  );

DROP POLICY IF EXISTS "broadcast_media_bucket_insert" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'broadcast-media'
    AND (
      private.current_user_can(private.storage_object_workspace_id(name), 'can_create')
      OR private.current_user_can(private.storage_object_workspace_id(name), 'can_update')
    )
  );

DROP POLICY IF EXISTS "broadcast_media_bucket_delete" ON storage.objects;
CREATE POLICY "broadcast_media_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'broadcast-media'
    AND NOT EXISTS (
      SELECT 1
      FROM public.broadcast_items
      WHERE broadcast_items.storage_bucket = storage.objects.bucket_id
        AND broadcast_items.storage_path = storage.objects.name
    )
    AND (
      private.current_user_can(private.storage_object_workspace_id(name), 'can_delete')
      OR private.current_user_can(private.storage_object_workspace_id(name), 'can_update')
      OR (
        private.current_user_can(private.storage_object_workspace_id(name), 'can_create')
        AND split_part(name, '/', 2) = auth.uid()::text
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_broadcast_with_items(
  p_broadcast_id uuid,
  p_workspace_id uuid,
  p_title text,
  p_description text,
  p_slug text,
  p_kind public.broadcast_kind,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT private.current_user_can(p_workspace_id, 'can_create') THEN
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
      OR item.storage_path NOT LIKE p_workspace_id::text || '/' || auth.uid()::text || '/' || p_broadcast_id::text || '/%'
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
  VALUES (p_broadcast_id, p_workspace_id, auth.uid(), trim(p_title), coalesce(trim(p_description), ''), trim(p_slug), p_kind);

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

CREATE OR REPLACE FUNCTION public.replace_broadcast_playlist(
  p_broadcast_id uuid,
  p_workspace_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_description text,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item_count integer;
  v_kind public.broadcast_kind;
  v_updated_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT private.current_user_can(p_workspace_id, 'can_update') THEN
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
        AND item.storage_path NOT LIKE p_workspace_id::text || '/' || auth.uid()::text || '/' || p_broadcast_id::text || '/%'
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

REVOKE ALL ON FUNCTION public.create_broadcast_with_items(uuid, uuid, text, text, text, public.broadcast_kind, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.replace_broadcast_playlist(uuid, uuid, timestamptz, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_broadcast_with_items(uuid, uuid, text, text, text, public.broadcast_kind, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_broadcast_playlist(uuid, uuid, timestamptz, text, text, jsonb) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'broadcasts'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'broadcast_items'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_items';
    END IF;
  END IF;
END
$$;

COMMIT;
