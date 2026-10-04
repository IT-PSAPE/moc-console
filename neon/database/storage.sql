-- Durable private storage upload sessions. Install after 01-runtime-roles.sql.
CREATE TABLE IF NOT EXISTS moc_private.storage_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  workspace_id uuid,
  purpose text NOT NULL CHECK (purpose IN ('avatar', 'stream-thumbnail', 'broadcast-audio', 'broadcast-video')),
  bucket text NOT NULL CHECK (bucket IN ('avatars', 'media', 'broadcast-media')),
  object_path text NOT NULL,
  staging_prefix text NOT NULL UNIQUE,
  file_name text NOT NULL,
  expected_size bigint NOT NULL CHECK (expected_size > 0),
  content_type text NOT NULL,
  expected_chunks integer NOT NULL CHECK (expected_chunks > 0),
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'queued', 'processing', 'complete', 'aborted', 'failed')),
  expected_sha256 text,
  completed_sha256 text,
  expires_at timestamptz NOT NULL,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (bucket, object_path)
);

CREATE INDEX IF NOT EXISTS storage_uploads_expiry_idx
  ON moc_private.storage_uploads (expires_at)
  WHERE status IN ('uploading', 'queued', 'processing', 'failed');

CREATE TABLE IF NOT EXISTS moc_private.storage_upload_chunks (
  upload_id uuid NOT NULL REFERENCES moc_private.storage_uploads(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  byte_size integer NOT NULL CHECK (byte_size > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  staging_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (upload_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS moc_private.storage_objects (
  bucket text NOT NULL CHECK (bucket IN ('avatars', 'media', 'broadcast-media')),
  object_path text NOT NULL,
  owner_user_id uuid NOT NULL,
  workspace_id uuid,
  purpose text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  content_type text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  upload_id uuid UNIQUE REFERENCES moc_private.storage_uploads(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, object_path)
);

CREATE TABLE IF NOT EXISTS moc_private.storage_finalize_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL UNIQUE REFERENCES moc_private.storage_uploads(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'complete', 'failed', 'aborted')),
  attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  multipart_upload_id text,
  completed_parts jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(completed_parts) = 'array'),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS storage_finalize_jobs_ready_idx
  ON moc_private.storage_finalize_jobs (next_attempt_at, created_at)
  WHERE state IN ('queued', 'processing');

-- Application sessions may stage chunks directly, but finalize-job rows carry
-- worker leases and must never be writable by moc_app. These narrow
-- SECURITY DEFINER functions atomically change only the caller's own upload.
CREATE OR REPLACE FUNCTION moc_private.enqueue_storage_upload(p_upload_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, moc_private
AS $$
DECLARE
  v_status text;
  v_expected_chunks integer;
  v_chunk_count integer;
  v_actor_id uuid := moc_private.actor_id();
BEGIN
  SELECT upload.status, upload.expected_chunks
    INTO v_status, v_expected_chunks
    FROM moc_private.storage_uploads upload
   WHERE upload.id = p_upload_id AND upload.owner_user_id = v_actor_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Storage upload not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status IN ('queued', 'processing', 'complete') THEN
    RETURN v_status;
  END IF;
  IF v_status <> 'uploading' THEN
    RAISE EXCEPTION 'Storage upload cannot be finalized' USING ERRCODE = '55000';
  END IF;

  SELECT count(*) INTO v_chunk_count
    FROM moc_private.storage_upload_chunks chunk
   WHERE chunk.upload_id = p_upload_id;
  IF v_chunk_count <> v_expected_chunks THEN
    RAISE EXCEPTION 'Storage upload is missing chunks' USING ERRCODE = '23514';
  END IF;

  UPDATE moc_private.storage_uploads
     SET status = 'queued', updated_at = now()
   WHERE id = p_upload_id AND owner_user_id = v_actor_id;
  INSERT INTO moc_private.storage_finalize_jobs(upload_id) VALUES (p_upload_id);
  RETURN 'queued';
END;
$$;

CREATE OR REPLACE FUNCTION moc_private.abort_storage_upload(p_upload_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, moc_private
AS $$
DECLARE
  v_status text;
  v_actor_id uuid := moc_private.actor_id();
BEGIN
  -- Match worker claim order (job then upload) to avoid an abort/finalize
  -- deadlock when a queued upload is claimed at the same time.
  PERFORM 1
    FROM moc_private.storage_finalize_jobs job
   WHERE job.upload_id = p_upload_id
     AND EXISTS (
       SELECT 1 FROM moc_private.storage_uploads upload
        WHERE upload.id = job.upload_id AND upload.owner_user_id = v_actor_id
     )
   FOR UPDATE OF job;
  SELECT upload.status INTO v_status
    FROM moc_private.storage_uploads upload
   WHERE upload.id = p_upload_id AND upload.owner_user_id = v_actor_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Storage upload not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status = 'aborted' THEN
    RETURN v_status;
  END IF;
  IF v_status NOT IN ('uploading', 'queued', 'failed') THEN
    RAISE EXCEPTION 'Storage upload can no longer be aborted' USING ERRCODE = '55000';
  END IF;

  UPDATE moc_private.storage_uploads
     SET status = 'aborted', updated_at = now()
   WHERE id = p_upload_id AND owner_user_id = v_actor_id;
  UPDATE moc_private.storage_finalize_jobs
     SET state = 'aborted', updated_at = now(), lease_token = NULL, lease_until = NULL
   WHERE upload_id = p_upload_id AND state <> 'complete';
  RETURN 'aborted';
END;
$$;

REVOKE ALL ON FUNCTION moc_private.enqueue_storage_upload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION moc_private.abort_storage_upload(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moc_private.enqueue_storage_upload(uuid) TO moc_app;
GRANT EXECUTE ON FUNCTION moc_private.abort_storage_upload(uuid) TO moc_app;

REVOKE ALL ON ALL TABLES IN SCHEMA moc_private FROM PUBLIC, moc_app, moc_public;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_uploads TO moc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_upload_chunks TO moc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_objects TO moc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_uploads TO moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_upload_chunks TO moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_objects TO moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON moc_private.storage_finalize_jobs TO moc_worker;

ALTER TABLE moc_private.storage_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE moc_private.storage_upload_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moc_private.storage_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_uploads_app_owner ON moc_private.storage_uploads;
CREATE POLICY storage_uploads_app_owner ON moc_private.storage_uploads
  FOR ALL TO moc_app
  USING (owner_user_id = moc_private.actor_id())
  WITH CHECK (
    owner_user_id = moc_private.actor_id()
    AND workspace_id IS NOT DISTINCT FROM nullif(current_setting('moc.workspace_id', true), '')::uuid
  );

DROP POLICY IF EXISTS storage_chunks_app_owner ON moc_private.storage_upload_chunks;
CREATE POLICY storage_chunks_app_owner ON moc_private.storage_upload_chunks
  FOR ALL TO moc_app
  USING (EXISTS (
    SELECT 1 FROM moc_private.storage_uploads upload
    WHERE upload.id = upload_id AND upload.owner_user_id = moc_private.actor_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM moc_private.storage_uploads upload
    WHERE upload.id = upload_id AND upload.owner_user_id = moc_private.actor_id()
  ));

DROP POLICY IF EXISTS storage_objects_app_owner ON moc_private.storage_objects;
CREATE POLICY storage_objects_app_owner ON moc_private.storage_objects
  FOR ALL TO moc_app
  USING (owner_user_id = moc_private.actor_id())
  WITH CHECK (owner_user_id = moc_private.actor_id());
