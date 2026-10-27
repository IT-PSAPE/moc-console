DO $$
BEGIN
  IF to_regclass('moc_private.console_push_subscriptions') IS NULL
    OR to_regclass('moc_private.console_push_deliveries') IS NULL THEN
    RAISE EXCEPTION 'Console push tables are missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid IN ('moc_private.console_push_subscriptions'::regclass, 'moc_private.console_push_deliveries'::regclass)
      AND NOT relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Console push tables require row security';
  END IF;
  IF NOT has_table_privilege('moc_app', 'moc_private.console_push_subscriptions', 'SELECT')
    OR NOT has_table_privilege('moc_app', 'moc_private.console_push_subscriptions', 'INSERT')
    OR NOT has_table_privilege('moc_app', 'moc_private.console_push_subscriptions', 'DELETE')
    OR NOT has_table_privilege('moc_worker', 'moc_private.console_push_deliveries', 'UPDATE')
    OR has_table_privilege('moc_public', 'moc_private.console_push_subscriptions', 'SELECT')
    OR has_table_privilege('moc_app', 'moc_private.console_push_deliveries', 'SELECT')
    OR has_table_privilege('moc_app', 'moc_private.console_push_deliveries', 'INSERT') THEN
    RAISE EXCEPTION 'Console push runtime privileges are invalid';
  END IF;
END;
$$;
