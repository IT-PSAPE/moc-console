-- nuke-everything.sql
--
-- DEV-ONLY. Wipes a Supabase project to a near-empty state regardless of what's
-- in it. Idempotent. Safe to re-run.
--
-- ⚠️  DESTRUCTIVE. THIS DELETES ALL USER DATA, AUTH USERS, STORAGE OBJECTS,
--     CRON JOBS, AND EVERY USER-CREATED SCHEMA. THERE IS NO UNDO.
--
-- This is different from phase-00-nuke.sql:
--   • phase-00-nuke.sql drops only the named objects this app creates.
--   • nuke-everything.sql discovers and drops EVERYTHING the app could have
--     created — including objects added later, by other tooling, or by hand.
--
-- WHAT THIS REMOVES (via SQL):
--   • Every table, view, materialized view, sequence, function, procedure,
--     and type in the public schema.
--   • Every user-created schema (anything outside the Supabase-reserved set).
--   • All rows in auth.users (cascades to identities, sessions, refresh_tokens).
--   • All storage objects and buckets.
--   • All pg_cron jobs (if pg_cron is installed).
--   • All realtime publication memberships.
--
-- WHAT THIS CANNOT REMOVE FROM SQL — handle in the Supabase dashboard:
--   • Edge Functions               → Functions sidebar
--   • Database webhooks            → Database → Webhooks
--   • Vault secrets                → Settings → Vault
--   • Project name / API keys / billing / org settings
--
-- STORAGE CAVEAT: this script removes `storage.objects` / `storage.buckets`
-- METADATA only. The underlying S3 files are NOT deleted (the protect_delete
-- trigger that normally enforces this is bypassed in section 3 — see comment
-- there). If you need to reclaim storage space, delete buckets via the
-- Supabase dashboard or Storage API BEFORE running this script.
--
-- HOW TO RUN: paste into the Supabase SQL editor. Runs as the `postgres` role,
-- which has the privileges needed for every step. Sections are independent —
-- if one fails (e.g. an extension is missing), the rest still execute.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Detach every realtime publication member so cascades below don't snag.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    for r in
      select schemaname, tablename
      from pg_publication_tables
      where pubname = 'supabase_realtime'
    loop
      execute format('alter publication supabase_realtime drop table %I.%I', r.schemaname, r.tablename);
    end loop;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Wipe scheduled jobs (pg_cron). No-op if the extension isn't installed.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'delete from cron.job';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Storage: delete objects first (they FK into buckets), then buckets.
--
--    Supabase ships a `storage.protect_delete()` BEFORE-DELETE trigger that
--    blocks plain `delete from storage.objects` so you don't strand S3 files
--    when you wipe the metadata table.
--
--    The bypass: SET ROLE to supabase_storage_admin (the owner of the storage
--    tables — `postgres` is a member of it on Supabase), DISABLE the user
--    triggers on storage.objects + storage.buckets, delete, restore.
--
--    If the role switch is denied (rare; e.g. self-hosted with locked-down
--    grants), this entire section is skipped with a NOTICE and the rest of
--    the nuke continues.
--
--    ⚠️  TRADEOFF: bypassing the trigger means the underlying S3 objects are
--    NOT deleted — only the metadata rows. For a true clean slate (no
--    orphaned files), delete buckets via the Supabase dashboard or Storage
--    API BEFORE running this script.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    return;
  end if;

  begin
    execute 'set local role supabase_storage_admin';

    execute 'alter table storage.objects disable trigger user';
    execute 'alter table storage.buckets disable trigger user';

    execute 'delete from storage.objects';
    execute 'delete from storage.buckets';

    execute 'alter table storage.objects enable trigger user';
    execute 'alter table storage.buckets enable trigger user';

    execute 'reset role';
  exception when others then
    raise notice
      'Storage wipe skipped: %. To remove storage cleanly (S3 + metadata together), delete buckets in the Supabase dashboard before re-running this script.',
      sqlerrm;
    -- Make sure we don't leave the session stuck as supabase_storage_admin.
    begin
      execute 'reset role';
    exception when others then null;
    end;
  end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auth: remove every user. Supabase's auth.users has ON DELETE CASCADE FKs
--    out to identities, sessions, refresh_tokens, mfa_factors, etc. — those
--    rows go with the users automatically.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    execute 'delete from auth.users';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Drop every user-created schema. The reserved list below is what Supabase
--    needs to keep functioning. `public` itself is preserved — its CONTENTS
--    are wiped in step 6.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select nspname
    from pg_namespace
    where nspname not in (
      -- Postgres system
      'pg_catalog', 'pg_toast', 'information_schema',
      -- Default user namespace (kept; contents wiped in step 6)
      'public',
      -- Supabase services
      'auth', 'storage', 'realtime', 'supabase_functions', 'supabase_migrations',
      -- Postgres extensions Supabase ships
      'extensions', 'vault', 'graphql', 'graphql_public',
      'pgsodium', 'pgsodium_masks', 'cron', 'net', 'pgbouncer',
      -- Newer Supabase analytics / dashboard
      '_analytics', '_realtime', '_supabase'
    )
    and nspname not like 'pg\_%' escape '\'
  loop
    execute format('drop schema if exists %I cascade', r.nspname);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Wipe the public schema's contents in dependency-safe order.
--    CASCADE handles policies, indexes, triggers, FKs.
-- ─────────────────────────────────────────────────────────────────────────────

-- 6a. Materialized views (don't cascade from regular views).
do $$
declare r record;
begin
  for r in select matviewname from pg_matviews where schemaname = 'public' loop
    execute format('drop materialized view if exists public.%I cascade', r.matviewname);
  end loop;
end $$;

-- 6b. Views.
do $$
declare r record;
begin
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
end $$;

-- 6c. Tables. CASCADE drops dependent policies, indexes, triggers, FKs,
--     and table-owned sequences.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- 6d. Standalone sequences (table-owned sequences were dropped above).
do $$
declare r record;
begin
  for r in select sequencename from pg_sequences where schemaname = 'public' loop
    execute format('drop sequence if exists public.%I cascade', r.sequencename);
  end loop;
end $$;

-- 6e. Functions and procedures. We use the regprocedure cast so overloaded
--     signatures all get dropped without us having to enumerate arg types.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as ident, p.prokind
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    if r.prokind = 'p' then
      execute format('drop procedure if exists %s cascade', r.ident);
    else
      execute format('drop function if exists %s cascade', r.ident);
    end if;
  end loop;
end $$;

-- 6f. Custom types (enums, composites, domains). Skip array types and the
--     row types Postgres autogenerates for each table (already gone).
do $$
declare r record;
begin
  for r in
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype in ('e', 'c', 'd')
      and not exists (select 1 from pg_class c where c.reltype = t.oid)
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Restore the standard Supabase grants on the now-empty public schema.
--    (Without this, anon/authenticated/service_role lose USAGE on public if
--    you previously revoked it — e.g. via phase-12-public-access.sql.)
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
