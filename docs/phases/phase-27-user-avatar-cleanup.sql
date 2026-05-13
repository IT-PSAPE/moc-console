-- ============================================================
-- Phase 27 — User avatar storage cleanup
-- Requires: Phase 26 (users.avatar_url + avatars bucket)
-- ============================================================
-- Automatically deletes the underlying storage object whenever a user's
-- avatar_url is replaced, cleared, or the user row is deleted. Avoids
-- orphaned files when users update or remove their photo.
--
-- The trigger function is SECURITY DEFINER so it can delete from
-- storage.objects regardless of the caller's privileges (the caller
-- already proved ownership of the row via RLS on public.users).
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_user_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  old_url text := OLD.avatar_url;
  old_path text;
BEGIN
  IF old_url IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Extract the object path (everything after the avatars bucket prefix).
  -- Example URL:
  --   https://<proj>.supabase.co/storage/v1/object/public/avatars/<uid>/<uuid>.jpg
  -- Yields:
  --   <uid>/<uuid>.jpg
  old_path := regexp_replace(old_url, '^.*/storage/v1/object/public/avatars/', '');

  -- If the regex did not actually replace anything the URL wasn't ours;
  -- skip rather than risk deleting a file we don't own.
  IF old_path = old_url THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  DELETE FROM storage.objects
   WHERE bucket_id = 'avatars'
     AND name = old_path;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_user_avatar() FROM PUBLIC;

DROP TRIGGER IF EXISTS users_avatar_cleanup_on_update ON public.users;
CREATE TRIGGER users_avatar_cleanup_on_update
  AFTER UPDATE OF avatar_url ON public.users
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url AND OLD.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.cleanup_user_avatar();

DROP TRIGGER IF EXISTS users_avatar_cleanup_on_delete ON public.users;
CREATE TRIGGER users_avatar_cleanup_on_delete
  AFTER DELETE ON public.users
  FOR EACH ROW
  WHEN (OLD.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.cleanup_user_avatar();
