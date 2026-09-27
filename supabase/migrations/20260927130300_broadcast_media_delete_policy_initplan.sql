-- Wraps auth.uid() in a scalar subquery so Postgres evaluates it once per
-- statement instead of once per row (the pattern every other policy uses).
-- Same rule as before; verify-current-schema.sql flagged the bare call.

BEGIN;

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
        AND split_part(name, '/', 2) = (select auth.uid())::text
      )
    )
  );

COMMIT;
