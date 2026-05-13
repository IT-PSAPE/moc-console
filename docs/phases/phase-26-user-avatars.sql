-- ============================================================
-- Phase 26 — User avatar storage
-- Requires: Phase 2 (users table), Phase 9 (RLS policies)
-- ============================================================
-- Adds an optional avatar_url to public.users and provisions a public
-- `avatars` storage bucket that users can write to only under their own
-- user-id prefix (e.g. `<auth.uid()>/<random>.png`).
--
-- Bucket policy:
--   - Public READ: anyone (anon + authenticated) can fetch objects so
--     avatars can be embedded in <img> tags without signed URLs.
--   - Authenticated INSERT / UPDATE / DELETE: only on paths whose first
--     segment is the caller's auth.uid(). This isolates each user's
--     avatar folder from every other user.
-- ============================================================

-- Step 1: Column on public.users for the resolved public URL.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Step 2: Storage bucket (public = true enables direct public URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Step 3: RLS policies on storage.objects for the `avatars` bucket.

DROP POLICY IF EXISTS "avatars_bucket_public_read" ON storage.objects;
CREATE POLICY "avatars_bucket_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_bucket_owner_insert" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_bucket_owner_update" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_bucket_owner_delete" ON storage.objects;
CREATE POLICY "avatars_bucket_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
