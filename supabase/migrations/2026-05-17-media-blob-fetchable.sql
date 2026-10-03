-- ============================================================
-- patch 2026-05-17 — media blob fetchability
-- ============================================================
-- Adds blob_fetchable: whether the media item's URL can be read as
-- a binary blob from the browser (i.e. it is same-origin or sends
-- CORS headers), determined client-side at add time for IMAGE media
-- via a stream-first-chunk-then-abort probe.
--
--   TRUE  — bytes are reachable; safe to re-upload as a YouTube
--           stream thumbnail.
--   FALSE — fetch/CORS-blocked; hidden from the thumbnail picker.
--   NULL  — not applicable (audio/video) or not yet probed (legacy
--           rows). Legacy NULL image rows stay selectable; the
--           stream modal re-validates on selection, so a stale one
--           surfaces a clear error instead of failing silently.
--
-- Idempotent: safe to run repeatedly on a live database. Also folded
-- into the canonical phase-01-schema.sql for fresh installs; this
-- patch is ONLY for already-provisioned databases.
-- ============================================================

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS blob_fetchable boolean NULL;
