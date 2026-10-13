-- Apply with a migration-owner connection before deploying request link API/UI.
-- The relationship is optional: deleting a request never deletes operational records.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.streams ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.zoom_meetings ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE OR REPLACE FUNCTION public.enforce_record_request_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NEW.request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = NEW.request_id AND r.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Linked request must belong to the same workspace';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['bookings', 'venue_bookings', 'streams', 'zoom_meetings'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', relation_name)::regclass
        AND conname = relation_name || '_request_id_fkey'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE SET NULL', relation_name, relation_name || '_request_id_fkey');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (workspace_id, request_id) WHERE request_id IS NOT NULL', relation_name || '_request_idx', relation_name);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', relation_name || '_enforce_request_workspace', relation_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF workspace_id, request_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_record_request_workspace()', relation_name || '_enforce_request_workspace', relation_name);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_record_request_workspace() FROM PUBLIC;
