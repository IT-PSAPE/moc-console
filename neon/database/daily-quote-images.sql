-- Install after overview.sql and storage.sql with the migration-owner connection.
ALTER TABLE public.daily_quotes ADD COLUMN IF NOT EXISTS image_path text;

ALTER TABLE moc_private.storage_uploads DROP CONSTRAINT IF EXISTS storage_uploads_purpose_check;
ALTER TABLE moc_private.storage_uploads ADD CONSTRAINT storage_uploads_purpose_check
  CHECK (purpose IN ('avatar', 'stream-thumbnail', 'quote-image', 'broadcast-audio', 'broadcast-video'));
