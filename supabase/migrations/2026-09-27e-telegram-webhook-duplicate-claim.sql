-- An in-flight duplicate Telegram update was answered with the row's raw
-- status ('processing'), which the API did not recognise. It then marked the
-- still-running original as failed. Return 'in_progress' instead.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_telegram_webhook_update(
  p_update_id bigint,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_update_id IS NULL OR p_update_id < 0 OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid Telegram update payload' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.telegram_webhook_updates (update_id, payload)
  VALUES (p_update_id, p_payload)
  ON CONFLICT (update_id) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  UPDATE public.telegram_webhook_updates
  SET payload = p_payload,
      status = 'processing',
      attempts = attempts + 1,
      processing_started_at = now(),
      processed_at = NULL,
      last_error = NULL
  WHERE update_id = p_update_id
    AND (
      status = 'failed'
      OR (status = 'processing' AND processing_started_at < now() - interval '5 minutes')
    );
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  SELECT status INTO v_status
  FROM public.telegram_webhook_updates
  WHERE update_id = p_update_id;
  -- 'processing' here means another invocation holds a fresh claim. Report it
  -- in the API's vocabulary so the duplicate gets a retryable 503 instead of
  -- an unexpected value.
  RETURN CASE WHEN v_status = 'processed' THEN 'processed' ELSE 'in_progress' END;
END;
$$;

COMMIT;
