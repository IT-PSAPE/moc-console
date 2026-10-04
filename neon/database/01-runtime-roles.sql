-- Runtime roles and actor context. Execute with the schema migration owner.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moc_app') THEN
    CREATE ROLE moc_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moc_public') THEN
    CREATE ROLE moc_public NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moc_worker') THEN
    CREATE ROLE moc_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END;
$$;

CREATE SCHEMA IF NOT EXISTS moc_private;
REVOKE ALL ON SCHEMA moc_private FROM PUBLIC;
GRANT USAGE ON SCHEMA moc_private TO moc_app, moc_public, moc_worker;

CREATE OR REPLACE FUNCTION moc_private.actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  configured_user text := nullif(current_setting('moc.user_id', true), '');
  selected_role text := nullif(current_setting('role', true), 'none');
BEGIN
  IF selected_role = 'moc_public' THEN
    RETURN NULL;
  END IF;
  IF coalesce(selected_role, '') NOT IN ('moc_app', 'moc_worker') THEN
    RAISE EXCEPTION 'actor context is unavailable for role %', selected_role USING ERRCODE = '42501';
  END IF;
  RETURN configured_user::uuid;
END;
$$;

REVOKE ALL ON FUNCTION moc_private.actor_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moc_private.actor_id() TO moc_app, moc_public, moc_worker;

-- The migration connection becomes able to switch to the three constrained roles.
GRANT moc_app, moc_public, moc_worker TO CURRENT_USER;
