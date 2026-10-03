-- Minimal Supabase-shaped schema for local migration/RLS integration tests.
-- This is test-only: it intentionally omits auth, storage, and application
-- behavior unrelated to workspace membership and scheduled messages.

DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA auth;
CREATE SCHEMA private;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  can_create boolean NOT NULL DEFAULT false,
  can_read boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_manage_roles boolean NOT NULL DEFAULT false
);

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  surname text NOT NULL,
  email text NOT NULL UNIQUE,
  telegram_chat_id text UNIQUE
);

CREATE TABLE public.workspace_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE public.telegram_groups (
  chat_id text PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL,
  is_forum boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.telegram_group_topics (
  group_chat_id text NOT NULL REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id bigint NOT NULL,
  name text NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_chat_id, thread_id)
);

CREATE TABLE public.notification_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  group_chat_id text REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id bigint,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_type text,
  scope text NOT NULL CHECK (scope IN ('group', 'dm')),
  route_id uuid REFERENCES public.notification_routes(id) ON DELETE SET NULL,
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  destination_key text NOT NULL,
  chat_id text NOT NULL,
  thread_id bigint,
  text text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  telegram_message_id bigint,
  last_error text,
  reply_markup jsonb,
  entity_type text,
  entity_id uuid,
  parent_delivery_id uuid REFERENCES public.notification_deliveries(id) ON DELETE SET NULL,
  telegram_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, destination_key)
);

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$ BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE FUNCTION private.current_user_can(p_workspace_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT coalesce(bool_or(
    CASE p_permission
      WHEN 'can_create' THEN role.can_create
      WHEN 'can_read' THEN role.can_read
      WHEN 'can_update' THEN role.can_update
      WHEN 'can_delete' THEN role.can_delete
      WHEN 'can_manage_roles' THEN role.can_manage_roles
      ELSE false
    END
  ), false)
  FROM public.workspace_users AS membership
  JOIN public.roles AS role ON role.id = membership.role_id
  WHERE membership.workspace_id = p_workspace_id
    AND membership.user_id = auth.uid()
$$;

CREATE FUNCTION private.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users AS membership
    WHERE membership.workspace_id = p_workspace_id
      AND membership.user_id = auth.uid()
  )
$$;

GRANT USAGE ON SCHEMA public, auth, private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_can(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_workspace_member(uuid) TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO authenticated, service_role;
