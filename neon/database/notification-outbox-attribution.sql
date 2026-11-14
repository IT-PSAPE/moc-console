-- Snapshot who caused a notification when its source row is written. The
-- outbox is retried later, so its original actor must not be inferred from
-- whichever worker happens to process it.

CREATE OR REPLACE FUNCTION public.capture_telegram_actor_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  actor_kind text := nullif(current_setting('moc.actor_kind', true), '');
  actor_name text := nullif(btrim(current_setting('moc.actor_name', true)), '');
  actor_id uuid := moc_private.actor_id();
  actor_source text;
  existing_actor jsonb;
  requester_name text;
BEGIN
  IF TG_TABLE_NAME = 'notification_outbox' THEN
    IF TG_OP = 'UPDATE' THEN
      -- Old rows without a snapshot stay explicitly unknown on replay. Never
      -- credit a later retrying caller with a historical event.
      existing_actor := coalesce(OLD.payload->'telegramActor', '{"source":"unknown"}'::jsonb);
      NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object('telegramActor', existing_actor);
      RETURN NEW;
    END IF;

    -- An explicit producer snapshot is the source of truth for server-side
    -- notification routes that enqueue outside the original DB transaction.
    IF NEW.payload ? 'telegramActor' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Assignment authorship changes only when the request duty actually does.
    IF TG_TABLE_NAME <> 'request_assignees' OR NEW.duty IS NOT DISTINCT FROM OLD.duty THEN
      NEW.telegram_actor := OLD.telegram_actor;
      RETURN NEW;
    END IF;
  END IF;

  IF actor_id IS NOT NULL THEN
    actor_source := 'member';
    IF actor_name IS NULL THEN
      SELECT nullif(btrim(concat_ws(' ', name, surname)), '')
        INTO actor_name FROM public.users WHERE id = actor_id;
    END IF;
  ELSIF actor_kind = 'requester' THEN
    actor_source := 'requester';
    IF actor_name IS NULL THEN
      requester_name := coalesce(NEW.payload->>'requesterName', '');
      actor_name := nullif(btrim(requester_name), '');
    END IF;
  ELSIF actor_kind IN ('integration', 'system') THEN
    actor_source := 'automation';
  ELSE
    actor_source := 'unknown';
  END IF;

  IF TG_TABLE_NAME = 'notification_outbox' THEN
    NEW.payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
      'telegramActor', jsonb_strip_nulls(jsonb_build_object('source', actor_source, 'name', actor_name))
    );
  ELSE
    NEW.telegram_actor := jsonb_strip_nulls(jsonb_build_object('source', actor_source, 'name', actor_name));
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.request_assignees
  ADD COLUMN IF NOT EXISTS telegram_actor jsonb;
ALTER TABLE public.checklist_item_assignees
  ADD COLUMN IF NOT EXISTS telegram_actor jsonb;

DROP TRIGGER IF EXISTS notification_outbox_capture_telegram_actor ON public.notification_outbox;
CREATE TRIGGER notification_outbox_capture_telegram_actor
BEFORE INSERT OR UPDATE ON public.notification_outbox
FOR EACH ROW EXECUTE FUNCTION public.capture_telegram_actor_snapshot();

DROP TRIGGER IF EXISTS request_assignees_capture_telegram_actor ON public.request_assignees;
CREATE TRIGGER request_assignees_capture_telegram_actor
BEFORE INSERT OR UPDATE ON public.request_assignees
FOR EACH ROW EXECUTE FUNCTION public.capture_telegram_actor_snapshot();

DROP TRIGGER IF EXISTS checklist_item_assignees_capture_telegram_actor ON public.checklist_item_assignees;
CREATE TRIGGER checklist_item_assignees_capture_telegram_actor
BEFORE INSERT ON public.checklist_item_assignees
FOR EACH ROW EXECUTE FUNCTION public.capture_telegram_actor_snapshot();

REVOKE ALL ON FUNCTION public.capture_telegram_actor_snapshot() FROM PUBLIC, moc_app, moc_public, moc_worker;
