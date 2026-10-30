-- Additive Overview defaults and workspace daily quote library.
-- Apply transactionally with a migration-owner connection.
CREATE OR REPLACE FUNCTION moc_private.valid_overview_item_kinds(kinds text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT kinds IS NOT NULL
    AND kinds <@ ARRAY['request', 'equipment', 'venue', 'stream', 'message']::text[]
    AND array_position(kinds, NULL) IS NULL
    AND cardinality(kinds) = (SELECT count(DISTINCT kind) FROM unnest(kinds) AS kind)
$$;
REVOKE ALL ON FUNCTION moc_private.valid_overview_item_kinds(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moc_private.valid_overview_item_kinds(text[]) TO moc_app, moc_worker;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS overview_item_kinds text[] NOT NULL
  DEFAULT ARRAY['request', 'equipment', 'venue', 'stream', 'message']::text[];
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND conname = 'users_overview_item_kinds_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_overview_item_kinds_check CHECK (moc_private.valid_overview_item_kinds(overview_item_kinds));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 1000),
  attribution text CHECK (attribution IS NULL OR length(attribution) <= 200),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS daily_quotes_workspace_active_idx ON public.daily_quotes (workspace_id, active, created_at, id);
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.daily_quotes'::regclass AND tgname = 'daily_quotes_updated_at') THEN
    CREATE TRIGGER daily_quotes_updated_at BEFORE UPDATE ON public.daily_quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_quotes' AND policyname = 'daily_quotes_read') THEN
    CREATE POLICY daily_quotes_read ON public.daily_quotes FOR SELECT TO moc_app USING (
      moc_private.is_workspace_member(workspace_id) AND
      ((active AND moc_private.current_user_can(workspace_id, 'can_read')) OR moc_private.current_user_can(workspace_id, 'can_manage_roles'))
    );
    CREATE POLICY daily_quotes_insert ON public.daily_quotes FOR INSERT TO moc_app WITH CHECK (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
    );
    CREATE POLICY daily_quotes_update ON public.daily_quotes FOR UPDATE TO moc_app USING (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
    ) WITH CHECK (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
    );
  END IF;
END $$;
REVOKE ALL ON TABLE public.daily_quotes FROM PUBLIC, moc_public;
GRANT SELECT, INSERT, UPDATE ON public.daily_quotes TO moc_app;
GRANT SELECT ON public.daily_quotes TO moc_worker;

-- An override belongs to a workspace-local day and expires by date selection.
-- A NULL quote restores automatic rotation without deleting audit history.
CREATE UNIQUE INDEX IF NOT EXISTS daily_quotes_workspace_id_idx ON public.daily_quotes (workspace_id, id);
CREATE TABLE IF NOT EXISTS public.daily_quote_overrides (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_date date NOT NULL,
  quote_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, quote_date),
  FOREIGN KEY (workspace_id, quote_id) REFERENCES public.daily_quotes(workspace_id, id)
);
ALTER TABLE public.daily_quote_overrides ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_quote_overrides' AND policyname = 'daily_quote_overrides_read') THEN
    CREATE POLICY daily_quote_overrides_read ON public.daily_quote_overrides FOR SELECT TO moc_app USING (
      moc_private.is_workspace_member(workspace_id) AND
      (moc_private.current_user_can(workspace_id, 'can_read') OR moc_private.current_user_can(workspace_id, 'can_manage_roles'))
    );
    CREATE POLICY daily_quote_overrides_insert ON public.daily_quote_overrides FOR INSERT TO moc_app WITH CHECK (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
      AND quote_date = (CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone(workspace_id))::date
      AND (quote_id IS NULL OR EXISTS (SELECT 1 FROM public.daily_quotes q WHERE q.workspace_id = daily_quote_overrides.workspace_id AND q.id = quote_id AND q.active))
    );
    CREATE POLICY daily_quote_overrides_update ON public.daily_quote_overrides FOR UPDATE TO moc_app USING (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
    ) WITH CHECK (
      moc_private.is_workspace_member(workspace_id) AND moc_private.current_user_can(workspace_id, 'can_manage_roles')
      AND quote_date = (CURRENT_TIMESTAMP AT TIME ZONE public.workspace_timezone(workspace_id))::date
      AND (quote_id IS NULL OR EXISTS (SELECT 1 FROM public.daily_quotes q WHERE q.workspace_id = daily_quote_overrides.workspace_id AND q.id = quote_id AND q.active))
    );
  END IF;
END $$;
REVOKE ALL ON TABLE public.daily_quote_overrides FROM PUBLIC, moc_public;
GRANT SELECT, INSERT, UPDATE ON public.daily_quote_overrides TO moc_app;
GRANT SELECT ON public.daily_quote_overrides TO moc_worker;
