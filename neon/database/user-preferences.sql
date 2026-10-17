-- Personal defaults belong to the signed-in user, independently of workspace roles.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS default_calendar_view text NOT NULL DEFAULT 'week'
  CONSTRAINT users_default_calendar_view_check CHECK (default_calendar_view IN ('day', 'week', 'month', 'agenda'));
