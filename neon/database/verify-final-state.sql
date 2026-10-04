-- Independent catalog assertions for the approved MoC Neon target schema.
DO $$
DECLARE
  expected_tables text[] := ARRAY[
    'api_rate_limit_windows', 'booking_items', 'bookings', 'broadcast_items',
    'broadcast_revision_counters', 'broadcast_revisions', 'broadcasts',
    'checklist_item_assignees', 'checklist_items', 'checklist_sections',
    'checklist_templates', 'checklists', 'equipment', 'notification_deliveries',
    'notification_ingest_replays', 'notification_message_templates',
    'notification_outbox', 'notification_routes', 'notification_settings',
    'request_activity', 'request_assignees', 'request_categories', 'request_comments',
    'requests', 'roles', 'scheduled_message_occurrences', 'scheduled_message_responses',
    'scheduled_message_schedules', 'scheduled_message_series_changes',
    'scheduled_message_sessions', 'scheduled_message_templates', 'streams',
    'telegram_group_topics', 'telegram_groups', 'telegram_link_tokens',
    'telegram_webhook_updates', 'template_items', 'template_sections', 'users',
    'venue_booking_slots', 'venue_bookings', 'venue_events', 'venues',
    'workspace_join_requests', 'workspace_member_types', 'workspace_users',
    'workspaces', 'youtube_connections', 'zoom_connections', 'zoom_meetings'
  ];
  actual_tables text[];
  missing_tables text[];
  unexpected_tables text[];
  missing_objects text[];
  missing_routines text[];
  invalid_role text;
BEGIN
  SELECT array_agg(tablename ORDER BY tablename)
  INTO actual_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT array_agg(name ORDER BY name)
  INTO missing_tables
  FROM unnest(expected_tables) AS name
  WHERE NOT name = ANY(coalesce(actual_tables, ARRAY[]::text[]));
  SELECT array_agg(name ORDER BY name)
  INTO unexpected_tables
  FROM unnest(coalesce(actual_tables, ARRAY[]::text[])) AS name
  WHERE NOT name = ANY(expected_tables);
  IF cardinality(coalesce(missing_tables, ARRAY[]::text[])) > 0
    OR cardinality(coalesce(unexpected_tables, ARRAY[]::text[])) > 0 THEN
    RAISE EXCEPTION 'Public table inventory drift; missing %, unexpected %', missing_tables, unexpected_tables;
  END IF;

  SELECT array_agg(required.object_name ORDER BY required.object_name)
  INTO missing_objects
  FROM (VALUES
    ('moc_auth."user"'),
    ('moc_auth.account'),
    ('moc_auth.session'),
    ('moc_auth.verification'),
    ('moc_auth.internal_request_nonce'),
    ('moc_private.integration_oauth_tokens'),
    ('moc_private.storage_uploads'),
    ('moc_private.storage_upload_chunks'),
    ('moc_private.storage_finalize_jobs'),
    ('moc_private.storage_objects'),
    ('public.broadcast_revision_counters'),
    ('public.broadcast_revisions')
  ) AS required(object_name)
  WHERE to_regclass(required.object_name) IS NULL;
  IF cardinality(coalesce(missing_objects, ARRAY[]::text[])) > 0 THEN
    RAISE EXCEPTION 'Required schema objects are missing: %', missing_objects;
  END IF;

  SELECT array_agg(required.routine_name ORDER BY required.routine_name)
  INTO missing_routines
  FROM (VALUES
    ('record_broadcast_revision'),
    ('public_submit_request'),
    ('public_submit_booking_batch'),
    ('approve_workspace_join_request'),
    ('set_workspace_member_role')
  ) AS required(routine_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc AS routine
    JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
    WHERE namespace.nspname = 'public' AND routine.proname = required.routine_name
  );
  IF cardinality(coalesce(missing_routines, ARRAY[]::text[])) > 0 THEN
    RAISE EXCEPTION 'Required domain routines are missing: %', missing_routines;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'id' AND udt_name = 'uuid' AND is_nullable = 'NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'f'
      AND confrelid = 'moc_auth."user"'::regclass
  ) THEN
    RAISE EXCEPTION 'public.users.id must remain a UUID FK to the MoC auth identity';
  END IF;

  SELECT rolname INTO invalid_role
  FROM pg_roles
  WHERE rolname IN ('moc_app', 'moc_public', 'moc_worker')
    AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole)
  LIMIT 1;
  IF invalid_role IS NOT NULL THEN
    RAISE EXCEPTION 'Runtime role % has unsafe login or administrative rights', invalid_role;
  END IF;
  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'moc_worker') THEN
    RAISE EXCEPTION 'moc_worker must retain its explicit internal-worker RLS bypass';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname IN ('moc_app', 'moc_public') ORDER BY rolname LIMIT 1) THEN
    RAISE EXCEPTION 'moc_app and moc_public must not bypass row security';
  END IF;

  IF NOT has_table_privilege('moc_app', 'public.broadcast_revisions', 'SELECT')
    OR has_table_privilege('moc_public', 'public.notification_outbox', 'SELECT')
    OR has_table_privilege('moc_public', 'public.requests', 'SELECT')
    OR has_table_privilege('moc_app', 'moc_private.integration_oauth_tokens', 'SELECT')
    OR NOT has_table_privilege('moc_worker', 'moc_private.integration_oauth_tokens', 'SELECT') THEN
    RAISE EXCEPTION 'Runtime table grants do not match the broadcast and outbox boundaries';
  END IF;
  IF NOT has_function_privilege('moc_app', 'moc_private.actor_id()', 'EXECUTE')
    OR NOT has_function_privilege('moc_app', 'public.refresh_equipment_status_for(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Application role is missing actor or equipment-trigger function execution';
  END IF;
  IF NOT has_schema_privilege('moc_worker', 'moc_auth', 'USAGE')
    OR NOT has_table_privilege('moc_worker', 'moc_auth.internal_request_nonce', 'SELECT')
    OR NOT has_table_privilege('moc_worker', 'moc_auth.internal_request_nonce', 'INSERT')
    OR NOT has_table_privilege('moc_worker', 'moc_auth.internal_request_nonce', 'DELETE')
    OR has_table_privilege('moc_worker', 'moc_auth.account', 'SELECT') THEN
    RAISE EXCEPTION 'Worker auth privileges must be limited to nonce replay protection';
  END IF;
END;
$$;

SELECT 'MoC Neon final-state catalog verified' AS result;
