-- ============================================================
-- MOC Console — Role-Based Access Control (RBAC) Migration
-- ============================================================
-- Run this script in the Supabase SQL Editor (single execution).
--
-- What it does:
--   1. Renames `roles` → `request_roles` (duty options for request assignments)
--   2. Creates an `app_role` enum (admin, editor, viewer)
--   3. Creates a `user_roles` table linking users to app-level roles
--   4. Creates a helper function `public.user_app_role()` for RLS policies
--   5. Drops ALL existing RLS policies and replaces them with role-aware ones
--   6. Seeds your two existing users with roles
--
-- Role definitions:
--   admin  — full access: create, read, update, delete requests; manage
--            assignees; manage user roles
--   editor — create, read, update requests; manage assignees; cannot delete
--            requests or manage user roles
--   viewer — read-only access to requests and assignees
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Rename `roles` → `request_roles`
-- ─────────────────────────────────────────────────────────────
-- Drop existing RLS policy on `roles` first (references the old table name)
DROP POLICY IF EXISTS "Authenticated users can read roles" ON roles;

ALTER TABLE roles RENAME TO request_roles;

-- Re-enable RLS and add read policy under the new name
ALTER TABLE request_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read request_roles"
  ON request_roles FOR SELECT
  TO authenticated
  USING (true);


-- ─────────────────────────────────────────────────────────────
-- 2. Create app_role enum and user_roles table
-- ─────────────────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE user_roles (
  user_id  uuid       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     app_role   NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- 3. Helper function: get current user's app role
-- ─────────────────────────────────────────────────────────────
-- Returns the app_role for the currently authenticated user.
-- Returns NULL if the user has no role assigned (treated as no access).

CREATE OR REPLACE FUNCTION public.user_app_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;


-- ─────────────────────────────────────────────────────────────
-- 4. Auto-assign default role on signup
-- ─────────────────────────────────────────────────────────────
-- When a new user signs up, give them the 'viewer' role by default.
-- Admins can promote them later.

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_assign_role
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();


-- ─────────────────────────────────────────────────────────────
-- 5. Drop ALL existing RLS policies (clean slate)
-- ─────────────────────────────────────────────────────────────

-- users
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- requests
DROP POLICY IF EXISTS "Authenticated users can read requests" ON requests;
DROP POLICY IF EXISTS "Authenticated users can insert requests" ON requests;
DROP POLICY IF EXISTS "Authenticated users can update requests" ON requests;
DROP POLICY IF EXISTS "Authenticated users can delete requests" ON requests;

-- request_assignees
DROP POLICY IF EXISTS "Authenticated users can read request_assignees" ON request_assignees;
DROP POLICY IF EXISTS "Authenticated users can insert request_assignees" ON request_assignees;
DROP POLICY IF EXISTS "Authenticated users can delete request_assignees" ON request_assignees;


-- ─────────────────────────────────────────────────────────────
-- 6. New RLS policies — role-aware
-- ─────────────────────────────────────────────────────────────

-- ── users table ──────────────────────────────────────────────
-- All authenticated users can read profiles
CREATE POLICY "All roles can read profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (any role)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── user_roles table ────────────────────────────────────────
-- All authenticated users can read roles (so app can check its own role)
CREATE POLICY "All roles can read user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete user roles
CREATE POLICY "Admins can insert user_roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.user_app_role() = 'admin');

CREATE POLICY "Admins can update user_roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (public.user_app_role() = 'admin')
  WITH CHECK (public.user_app_role() = 'admin');

CREATE POLICY "Admins can delete user_roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (public.user_app_role() = 'admin');

-- ── requests table ──────────────────────────────────────────
-- All roles can read requests
CREATE POLICY "All roles can read requests"
  ON requests FOR SELECT
  TO authenticated
  USING (public.user_app_role() IS NOT NULL);

-- Admin and editor can create requests
CREATE POLICY "Admin and editor can insert requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (public.user_app_role() IN ('admin', 'editor'));

-- Admin and editor can update requests
CREATE POLICY "Admin and editor can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (public.user_app_role() IN ('admin', 'editor'));

-- Only admin can delete requests
CREATE POLICY "Only admin can delete requests"
  ON requests FOR DELETE
  TO authenticated
  USING (public.user_app_role() = 'admin');

-- ── request_assignees table ─────────────────────────────────
-- All roles can read assignees
CREATE POLICY "All roles can read request_assignees"
  ON request_assignees FOR SELECT
  TO authenticated
  USING (public.user_app_role() IS NOT NULL);

-- Admin and editor can assign members
CREATE POLICY "Admin and editor can insert request_assignees"
  ON request_assignees FOR INSERT
  TO authenticated
  WITH CHECK (public.user_app_role() IN ('admin', 'editor'));

-- Admin and editor can remove members
CREATE POLICY "Admin and editor can delete request_assignees"
  ON request_assignees FOR DELETE
  TO authenticated
  USING (public.user_app_role() IN ('admin', 'editor'));


-- ─────────────────────────────────────────────────────────────
-- 7. Seed user roles for existing users
-- ─────────────────────────────────────────────────────────────
-- This assigns 'admin' to ALL existing users. After running, you can
-- demote specific users by updating their role:
--
--   UPDATE user_roles SET role = 'editor' WHERE user_id = '<uuid>';
--   UPDATE user_roles SET role = 'viewer' WHERE user_id = '<uuid>';
--
-- Or target by email:
--
--   UPDATE user_roles SET role = 'viewer'
--   WHERE user_id = (SELECT id FROM users WHERE email = 'someone@example.com');

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM users
ON CONFLICT (user_id) DO NOTHING;


COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 8. Verification queries (run after the migration)
-- ─────────────────────────────────────────────────────────────
-- SELECT * FROM request_roles;          -- should show the 8 duty roles
-- SELECT * FROM user_roles;             -- should show your users with 'admin'
-- SELECT public.user_app_role();        -- should return your role when logged in
--
-- To test RLS, use Supabase's "SQL Editor > Run as user" feature
-- or the API with different user tokens.
