-- ============================================================
-- Phase 21 — Telegram Groups & Forum Topics
-- Requires: Phase 02 (public.users), Phase 08 (private helpers),
--           Phase 09 (RLS pattern), Phase 20 (Telegram linking)
-- ============================================================
-- Captures groups/supergroups the bot has been added to, plus
-- forum topics (threads) within them, so the app can later send
-- event-driven notifications to specific groups/topics.
--
-- Population is driven by api/telegram/webhook.ts using the
-- service-role key (bypasses RLS):
--   - my_chat_member updates upsert/soft-delete telegram_groups
--   - forum_topic_* service messages upsert telegram_group_topics
--
-- Admins (can_manage_roles) read these tables and toggle
-- telegram_groups.active. Authenticated non-admin users have no
-- access.
--
-- IMPORTANT (operational): re-run setWebhook with my_chat_member
-- in allowed_updates, e.g.:
--   curl -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
--     -d url=$URL -d secret_token=$SECRET \
--     -d 'allowed_updates=["message","edited_message","my_chat_member"]'
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telegram_groups (
  chat_id     text        PRIMARY KEY,
  title       text        NOT NULL,
  type        text        NOT NULL,
  is_forum    boolean     NOT NULL DEFAULT false,
  active      boolean     NOT NULL DEFAULT false,
  added_at    timestamptz NOT NULL DEFAULT now(),
  removed_at  timestamptz NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_groups_active_idx
  ON public.telegram_groups (active) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.telegram_group_topics (
  group_chat_id text        NOT NULL REFERENCES public.telegram_groups(chat_id) ON DELETE CASCADE,
  thread_id     bigint      NOT NULL,
  name          text        NOT NULL,
  closed        boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_chat_id, thread_id)
);

CREATE INDEX IF NOT EXISTS telegram_group_topics_group_idx
  ON public.telegram_group_topics (group_chat_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_telegram_groups_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS telegram_groups_set_updated_at ON public.telegram_groups;
CREATE TRIGGER telegram_groups_set_updated_at
  BEFORE UPDATE ON public.telegram_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_groups_updated_at();

CREATE OR REPLACE FUNCTION public.set_telegram_group_topics_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS telegram_group_topics_set_updated_at ON public.telegram_group_topics;
CREATE TRIGGER telegram_group_topics_set_updated_at
  BEFORE UPDATE ON public.telegram_group_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_group_topics_updated_at();

-- ============================================================
-- RLS — admin-only read/update; webhook (service role) bypasses
-- ============================================================

ALTER TABLE public.telegram_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_group_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telegram_groups_select_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_select_admin" ON public.telegram_groups
  FOR SELECT TO authenticated
  USING (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "telegram_groups_update_admin" ON public.telegram_groups;
CREATE POLICY "telegram_groups_update_admin" ON public.telegram_groups
  FOR UPDATE TO authenticated
  USING (private.current_user_can('can_manage_roles'))
  WITH CHECK (private.current_user_can('can_manage_roles'));

DROP POLICY IF EXISTS "telegram_group_topics_select_admin" ON public.telegram_group_topics;
CREATE POLICY "telegram_group_topics_select_admin" ON public.telegram_group_topics
  FOR SELECT TO authenticated
  USING (private.current_user_can('can_manage_roles'));
