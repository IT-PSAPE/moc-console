-- ============================================================
-- Phase 20 — Telegram Linking
-- Requires: Phase 02 (public.users), Phase 09 (RLS)
-- ============================================================
-- Adds a short-lived one-time token table used to bind a
-- Telegram chat id to a public.users row when the user clicks
-- "Link Telegram" on the profile page and the bot receives
-- /start <token>. Tokens are 15 minute TTL and consumed on use
-- by the webhook (which uses the service-role key and bypasses
-- RLS). Authenticated users can manage their own pending tokens.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  token       text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS telegram_link_tokens_user_id_idx
  ON public.telegram_link_tokens (user_id);

CREATE INDEX IF NOT EXISTS telegram_link_tokens_expires_at_idx
  ON public.telegram_link_tokens (expires_at);

ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telegram_link_tokens_insert_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_insert_self" ON public.telegram_link_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_link_tokens_select_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_select_self" ON public.telegram_link_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_link_tokens_delete_self" ON public.telegram_link_tokens;
CREATE POLICY "telegram_link_tokens_delete_self" ON public.telegram_link_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
