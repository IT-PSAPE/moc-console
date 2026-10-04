-- Durable, per-broadcast revisions used by public playback subscribers.
-- Counter updates serialize concurrent writes for the same broadcast; the
-- revision event is committed in the same transaction as the playlist edit.

CREATE TABLE IF NOT EXISTS public.broadcast_revision_counters (
  broadcast_id uuid PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE TABLE IF NOT EXISTS public.broadcast_revisions (
  broadcast_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  change_type text NOT NULL CHECK (change_type IN ('changed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, revision)
);

CREATE INDEX IF NOT EXISTS broadcast_revisions_created_at_idx
  ON public.broadcast_revisions (created_at);

CREATE OR REPLACE FUNCTION public.record_broadcast_revision(
  p_broadcast_id uuid,
  p_change_type text DEFAULT 'changed'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_revision bigint;
BEGIN
  IF p_change_type NOT IN ('changed', 'deleted') THEN
    RAISE EXCEPTION 'Invalid broadcast change type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.broadcast_revision_counters (broadcast_id, revision)
  VALUES (p_broadcast_id, 1)
  ON CONFLICT (broadcast_id)
  DO UPDATE SET revision = public.broadcast_revision_counters.revision + 1
  RETURNING revision INTO v_revision;

  INSERT INTO public.broadcast_revisions (broadcast_id, revision, change_type)
  VALUES (p_broadcast_id, v_revision, p_change_type);

  RETURN v_revision;
END;
$$;

-- Call from the worker on a regular schedule. Stream reads also filter to
-- this horizon, so expired cursors receive a reset marker instead of stale
-- playlist events.
CREATE OR REPLACE FUNCTION public.prune_broadcast_revisions()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH removed AS (
    DELETE FROM public.broadcast_revisions
    WHERE created_at < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*)::bigint FROM removed;
$$;

REVOKE ALL ON public.broadcast_revision_counters, public.broadcast_revisions FROM PUBLIC, moc_app, moc_public, moc_worker;
GRANT SELECT ON public.broadcast_revisions, public.broadcast_revision_counters TO moc_app, moc_public, moc_worker;
-- API operations perform explicit scoped SQL under the actor transaction;
-- table policies still enforce the selected workspace and membership role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts, public.broadcast_items TO moc_app;
REVOKE ALL ON FUNCTION public.record_broadcast_revision(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_broadcast_revision(uuid, text) TO moc_app;
GRANT EXECUTE ON FUNCTION public.prune_broadcast_revisions() TO moc_worker;
