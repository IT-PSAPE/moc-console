-- Adds append-only request history and internal comments. Activity is written
-- by a database trigger so every request lifecycle change has server time and
-- the authenticated actor when one is available.
BEGIN;

CREATE TABLE IF NOT EXISTS public.request_activity (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id   uuid        NULL REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text        NOT NULL CHECK (event_type IN ('created', 'updated', 'title_updated', 'status_changed')),
  details    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid        NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  actor_id   uuid        NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE RESTRICT,
  body       text        NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_activity_request_created_at
  ON public.request_activity (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_comments_request_created_at
  ON public.request_comments (request_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_request_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_details    jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'created';
    v_details := jsonb_build_object('requester_name', NEW.requested_by);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_type := 'status_changed';
    v_details := jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status);
  ELSIF NEW.title IS DISTINCT FROM OLD.title THEN
    v_event_type := 'title_updated';
    v_details := jsonb_build_object('from_title', OLD.title, 'to_title', NEW.title);
  ELSE
    v_event_type := 'updated';
  END IF;

  INSERT INTO public.request_activity (request_id, actor_id, event_type, details)
  VALUES (NEW.id, auth.uid(), v_event_type, v_details);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_request_activity ON public.requests;
CREATE TRIGGER record_request_activity
  AFTER INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.record_request_activity();

ALTER TABLE public.request_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_activity_select" ON public.request_activity
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_activity.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

CREATE POLICY "request_comments_select" ON public.request_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_comments.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_read')
  );

CREATE POLICY "request_comments_insert" ON public.request_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.requests
      WHERE requests.id = request_comments.request_id
        AND private.is_workspace_member(requests.workspace_id)
    )
    AND private.current_user_can('can_update')
  );

COMMIT;
