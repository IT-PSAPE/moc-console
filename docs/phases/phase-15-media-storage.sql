-- ============================================================
-- Phase 15 — Media storage bucket
-- Requires: Phase 9 (RLS policies)
-- ============================================================
-- Creates the public `media` storage bucket used by the Media Library
-- (src/features/broadcast/upload-media-modal.tsx → uploadMediaFile).
--
-- Bucket policy:
--   - Public READ: anyone (anon + authenticated) can fetch objects.
--   - Authenticated INSERT / UPDATE / DELETE: any signed-in user.
--     Workspace-scoped + role-based (can_create / can_update / can_delete)
--     authorization for the underlying media row is already enforced by the
--     RLS policies on public.media in phase-09-rls-policies.sql.
-- ============================================================

-- Step 1: Create the bucket (public = true enables direct public URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Step 2: RLS policies on storage.objects for the `media` bucket.
-- Note: RLS is already enabled on storage.objects by Supabase.

DROP POLICY IF EXISTS "media_bucket_public_read" ON storage.objects;
CREATE POLICY "media_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_insert" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_update" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_bucket_authenticated_delete" ON storage.objects;
CREATE POLICY "media_bucket_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media');
