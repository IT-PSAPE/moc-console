-- Console Web Push credentials are private, personal, and independent of a
-- selected workspace. Only the worker can read or write the delivery queue.
CREATE TABLE IF NOT EXISTS moc_private.console_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (length(endpoint) BETWEEN 1 AND 2048),
  p256dh text NOT NULL CHECK (length(p256dh) BETWEEN 86 AND 88),
  auth text NOT NULL CHECK (length(auth) BETWEEN 22 AND 24),
  expiration_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS console_push_subscriptions_user_idx
  ON moc_private.console_push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS moc_private.console_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES moc_private.console_push_subscriptions(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_key text NOT NULL CHECK (length(event_key) BETWEEN 1 AND 256),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_key, subscription_id)
);
CREATE INDEX IF NOT EXISTS console_push_deliveries_due_idx
  ON moc_private.console_push_deliveries(next_attempt_at, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS console_push_deliveries_subscription_idx
  ON moc_private.console_push_deliveries(subscription_id);

ALTER TABLE moc_private.console_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moc_private.console_push_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS console_push_subscriptions_own ON moc_private.console_push_subscriptions;
CREATE POLICY console_push_subscriptions_own ON moc_private.console_push_subscriptions
  FOR ALL TO moc_app
  USING (user_id = moc_private.actor_id())
  WITH CHECK (user_id = moc_private.actor_id());

REVOKE ALL ON moc_private.console_push_subscriptions, moc_private.console_push_deliveries
  FROM PUBLIC, moc_public, moc_app, moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.console_push_subscriptions TO moc_app, moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.console_push_deliveries TO moc_worker;
