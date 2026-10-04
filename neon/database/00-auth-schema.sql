-- Better Auth storage for the self-hosted MoC authentication service.
-- Auth identities are application-owned and retain the UUIDs used by public.users.
CREATE SCHEMA IF NOT EXISTS moc_auth;

CREATE TABLE IF NOT EXISTS moc_auth."user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  surname text NOT NULL DEFAULT '',
  workspace_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moc_auth.account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES moc_auth."user" (id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, account_id)
);
CREATE INDEX IF NOT EXISTS moc_auth_account_user_id_idx ON moc_auth.account (user_id);

CREATE TABLE IF NOT EXISTS moc_auth.session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id uuid NOT NULL REFERENCES moc_auth."user" (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS moc_auth_session_user_id_idx ON moc_auth.session (user_id);
CREATE INDEX IF NOT EXISTS moc_auth_session_expires_at_idx ON moc_auth.session (expires_at);

CREATE TABLE IF NOT EXISTS moc_auth.verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moc_auth_verification_identifier_idx ON moc_auth.verification (identifier);
CREATE INDEX IF NOT EXISTS moc_auth_verification_expires_at_idx ON moc_auth.verification (expires_at);

-- API-to-Function requests are signed and each nonce may be claimed once.
CREATE TABLE IF NOT EXISTS moc_auth.internal_request_nonce (
  nonce text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS moc_auth_internal_request_nonce_expires_at_idx
  ON moc_auth.internal_request_nonce (expires_at);
