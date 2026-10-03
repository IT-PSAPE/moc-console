CREATE FUNCTION pg_temp.assert_rejected(p_sql text, p_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF position(p_message IN SQLERRM) > 0 THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Expected error containing "%", got "%" while running: %', p_message, SQLERRM, p_sql;
  END;
  RAISE EXCEPTION 'Expected error containing "%" but statement succeeded: %', p_message, p_sql;
END $$;
