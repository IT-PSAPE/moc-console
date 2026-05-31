-- Track per-item collection timestamps captured during QR scanning.
ALTER TABLE public.booking_items
  ADD COLUMN IF NOT EXISTS collected_at timestamptz NULL;
