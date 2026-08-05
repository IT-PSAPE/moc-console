-- Read-only drift report for the current MoC Console Supabase target.
--
-- Run this before deployment and after every migration. Every issue array
-- should be empty, memberships_without_roles should be 0, legacy_role_table
-- should be null, and missing_tracked_reliability_migration should be false.
-- recorded_migrations and checked_at are informational.

WITH expected_tables(name) AS (
  VALUES
    ('api_rate_limit_windows'), ('booking_items'), ('bookings'), ('bug_reports'),
    ('checklist_item_assignees'), ('checklist_items'), ('checklist_sections'),
    ('checklist_templates'), ('checklists'), ('equipment'),
    ('notification_deliveries'), ('notification_ingest_replays'),
    ('notification_message_templates'), ('notification_outbox'),
    ('notification_recipients'), ('notification_routes'), ('notification_settings'),
    ('request_activity'), ('request_assignees'), ('request_comments'), ('requests'),
    ('roles'), ('streams'), ('telegram_group_topics'), ('telegram_groups'),
    ('telegram_link_tokens'), ('telegram_webhook_updates'), ('template_items'),
    ('template_sections'), ('users'), ('workspace_join_requests'),
    ('workspace_users'), ('workspaces'), ('youtube_connections'),
    ('zoom_connections'), ('zoom_meetings')
),
actual_tables AS (
  SELECT relation.relname AS name, relation.relrowsecurity AS rls_enabled
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public' AND relation.relkind IN ('r', 'p')
),
expected_columns(table_schema, table_name, column_name, data_type, is_nullable) AS (
  VALUES
    ('private', 'integration_oauth_tokens', 'provider', 'text', false),
    ('private', 'integration_oauth_tokens', 'workspace_id', 'uuid', false),
    ('private', 'integration_oauth_tokens', 'access_token', 'text', false),
    ('private', 'integration_oauth_tokens', 'refresh_token', 'text', false),
    ('private', 'integration_oauth_tokens', 'token_expires_at', 'timestamp with time zone', false),
    ('private', 'integration_oauth_tokens', 'refresh_lock_id', 'uuid', true),
    ('private', 'integration_oauth_tokens', 'refresh_lock_expires_at', 'timestamp with time zone', true),
    ('public', 'youtube_connections', 'status', 'USER-DEFINED', false),
    ('public', 'zoom_connections', 'status', 'USER-DEFINED', false),
    ('public', 'requests', 'stale_notification_claimed_at', 'timestamp with time zone', true),
    ('public', 'requests', 'stale_notification_event_key', 'text', true),
    ('public', 'bookings', 'stale_notification_claimed_at', 'timestamp with time zone', true),
    ('public', 'bookings', 'stale_notification_event_key', 'text', true),
    ('public', 'telegram_webhook_updates', 'update_id', 'bigint', false),
    ('public', 'telegram_webhook_updates', 'payload', 'jsonb', false),
    ('public', 'telegram_webhook_updates', 'status', 'text', false),
    ('public', 'telegram_webhook_updates', 'attempts', 'integer', false),
    ('public', 'notification_ingest_replays', 'nonce', 'text', false),
    ('public', 'notification_ingest_replays', 'expires_at', 'timestamp with time zone', false),
    ('public', 'api_rate_limit_windows', 'policy', 'text', false),
    ('public', 'api_rate_limit_windows', 'subject_hash', 'text', false),
    ('public', 'api_rate_limit_windows', 'window_started_at', 'timestamp with time zone', false),
    ('public', 'api_rate_limit_windows', 'request_count', 'integer', false)
),
expected_indexes(schema_name, table_name, index_name) AS (
  VALUES
    ('public', 'checklist_item_assignees', 'idx_checklist_item_assignees_user_id'),
    ('public', 'notification_recipients', 'idx_notification_recipients_user_id'),
    ('public', 'notification_routes', 'idx_notification_routes_group_chat_id'),
    ('public', 'notification_outbox', 'idx_notification_outbox_workspace_id'),
    ('public', 'notification_deliveries', 'idx_notification_deliveries_route_id'),
    ('public', 'notification_deliveries', 'idx_notification_deliveries_recipient_user_id'),
    ('public', 'request_activity', 'idx_request_activity_actor_id'),
    ('public', 'request_comments', 'idx_request_comments_actor_id'),
    ('public', 'youtube_connections', 'idx_youtube_connections_connected_by'),
    ('public', 'streams', 'idx_streams_created_by'),
    ('public', 'zoom_connections', 'idx_zoom_connections_connected_by'),
    ('public', 'zoom_meetings', 'idx_zoom_meetings_created_by'),
    ('private', 'integration_oauth_tokens', 'idx_integration_oauth_tokens_workspace_id'),
    ('public', 'telegram_webhook_updates', 'idx_telegram_webhook_updates_retry'),
    ('public', 'notification_ingest_replays', 'idx_notification_ingest_replays_expires_at'),
    ('public', 'api_rate_limit_windows', 'idx_api_rate_limit_windows_expiry')
),
actual_indexes AS (
  SELECT namespace.nspname AS schema_name, relation.relname AS table_name,
         index_relation.relname AS index_name
  FROM pg_index AS index_definition
  JOIN pg_class AS relation ON relation.oid = index_definition.indrelid
  JOIN pg_class AS index_relation ON index_relation.oid = index_definition.indexrelid
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
),
expected_functions(signature) AS (
  VALUES
    ('public.get_integration_oauth_tokens(text,uuid)'),
    ('public.save_integration_oauth_connection(text,uuid,text,text,timestamptz,jsonb)'),
    ('public.try_acquire_integration_oauth_refresh_lock(text,uuid,text,uuid,timestamptz)'),
    ('public.complete_integration_oauth_token_refresh(text,uuid,text,uuid,text,text,timestamptz)'),
    ('public.release_integration_oauth_refresh_lock(text,uuid,uuid)'),
    ('public.delete_integration_oauth_connection(text,uuid)'),
    ('public.claim_stale_requests()'),
    ('public.claim_stale_bookings()'),
    ('public.complete_stale_request_notification(uuid,text)'),
    ('public.complete_stale_booking_notification(uuid,text)'),
    ('public.enqueue_notification_outbox_event(uuid,text,text,uuid,text,jsonb)'),
    ('public.claim_telegram_webhook_update(bigint,jsonb)'),
    ('public.complete_telegram_webhook_update(bigint)'),
    ('public.fail_telegram_webhook_update(bigint,text)'),
    ('public.consume_telegram_link_token(text,text)'),
    ('public.claim_notification_ingest_nonce(text,timestamptz)'),
    ('public.consume_api_rate_limit(text,text)'),
    ('public.purge_api_maintenance_data()')
),
public_functions AS (
  SELECT function_row.oid, function_row.oid::regprocedure::text AS signature,
         function_row.proname, function_row.proconfig, function_row.prosecdef,
         function_row.prorettype
  FROM pg_proc AS function_row
  JOIN pg_namespace AS namespace ON namespace.oid = function_row.pronamespace
  WHERE namespace.nspname = 'public'
),
service_only_tables(table_name) AS (
  VALUES
    ('api_rate_limit_windows'), ('notification_deliveries'),
    ('notification_ingest_replays'), ('notification_outbox'),
    ('telegram_webhook_updates')
),
service_only_functions(signature) AS (
  SELECT signature FROM expected_functions
),
required_triggers(table_name, trigger_name) AS (
  VALUES
    ('requests', 'set_updated_at'), ('bookings', 'set_bookings_updated_at'),
    ('streams', 'streams_enqueue_created_notification'),
    ('zoom_meetings', 'zoom_meetings_enqueue_created_notification'),
    ('notification_outbox', 'set_notification_outbox_updated_at'),
    ('notification_deliveries', 'set_notification_deliveries_updated_at')
),
actual_triggers AS (
  SELECT event_object_table AS table_name, trigger_name
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
)
SELECT jsonb_build_object(
  'checked_at', now(),
  'missing_public_tables', coalesce((
    SELECT jsonb_agg(expected.name ORDER BY expected.name)
    FROM expected_tables AS expected
    LEFT JOIN actual_tables AS actual USING (name)
    WHERE actual.name IS NULL
  ), '[]'::jsonb),
  'unexpected_public_tables', coalesce((
    SELECT jsonb_agg(actual.name ORDER BY actual.name)
    FROM actual_tables AS actual
    LEFT JOIN expected_tables AS expected USING (name)
    WHERE expected.name IS NULL
  ), '[]'::jsonb),
  'public_tables_without_rls', coalesce((
    SELECT jsonb_agg(name ORDER BY name) FROM actual_tables WHERE NOT rls_enabled
  ), '[]'::jsonb),
  'missing_or_mismatched_columns', coalesce((
    SELECT jsonb_agg(format('%I.%I.%I', expected.table_schema, expected.table_name, expected.column_name)
                     ORDER BY expected.table_schema, expected.table_name, expected.column_name)
    FROM expected_columns AS expected
    LEFT JOIN information_schema.columns AS actual
      ON actual.table_schema = expected.table_schema
     AND actual.table_name = expected.table_name
     AND actual.column_name = expected.column_name
     AND actual.data_type = expected.data_type
     AND (actual.is_nullable = CASE WHEN expected.is_nullable THEN 'YES' ELSE 'NO' END)
    WHERE actual.column_name IS NULL
  ), '[]'::jsonb),
  'missing_required_constraints', coalesce((
    SELECT jsonb_agg(name ORDER BY name)
    FROM (
      VALUES
        ('private.integration_oauth_tokens primary key'),
        ('public.telegram_webhook_updates primary key'),
        ('public.notification_ingest_replays primary key'),
        ('public.api_rate_limit_windows primary key')
    ) AS expected(name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE constraint_row.contype = 'p'
        AND (
          (expected.name = 'private.integration_oauth_tokens primary key' AND namespace.nspname = 'private' AND relation.relname = 'integration_oauth_tokens')
          OR (expected.name = 'public.telegram_webhook_updates primary key' AND namespace.nspname = 'public' AND relation.relname = 'telegram_webhook_updates')
          OR (expected.name = 'public.notification_ingest_replays primary key' AND namespace.nspname = 'public' AND relation.relname = 'notification_ingest_replays')
          OR (expected.name = 'public.api_rate_limit_windows primary key' AND namespace.nspname = 'public' AND relation.relname = 'api_rate_limit_windows')
        )
    )
  ), '[]'::jsonb),
  'missing_required_indexes', coalesce((
    SELECT jsonb_agg(format('%I.%I.%I', expected.schema_name, expected.table_name, expected.index_name)
                     ORDER BY expected.schema_name, expected.table_name, expected.index_name)
    FROM expected_indexes AS expected
    LEFT JOIN actual_indexes AS actual
      ON actual.schema_name = expected.schema_name
     AND actual.table_name = expected.table_name
     AND actual.index_name = expected.index_name
    WHERE actual.index_name IS NULL
  ), '[]'::jsonb),
  'missing_required_triggers', coalesce((
    SELECT jsonb_agg(format('%I.%I', expected.table_name, expected.trigger_name)
                     ORDER BY expected.table_name, expected.trigger_name)
    FROM required_triggers AS expected
    LEFT JOIN actual_triggers AS actual USING (table_name, trigger_name)
    WHERE actual.trigger_name IS NULL
  ), '[]'::jsonb),
  'stale_marker_updates_touch_activity', coalesce((
    SELECT jsonb_agg('public.set_updated_at'::text)
    WHERE pg_get_functiondef(to_regprocedure('public.set_updated_at()')) NOT LIKE '%stale_notification_claimed_at%'
  ), '[]'::jsonb),
  'missing_required_functions', coalesce((
    SELECT jsonb_agg(expected.signature ORDER BY expected.signature)
    FROM expected_functions AS expected
    WHERE to_regprocedure(expected.signature) IS NULL
  ), '[]'::jsonb),
  'security_definer_functions_with_mutable_search_path', coalesce((
    SELECT jsonb_agg(signature ORDER BY signature)
    FROM public_functions
    WHERE prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  ), '[]'::jsonb),
  'service_only_functions_exposed_to_clients', coalesce((
    SELECT jsonb_agg(expected.signature ORDER BY expected.signature)
    FROM service_only_functions AS expected
    JOIN public_functions AS function_row ON function_row.signature = expected.signature
    WHERE has_function_privilege('anon', function_row.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', function_row.oid, 'EXECUTE')
  ), '[]'::jsonb),
  'service_only_tables_with_client_grants', coalesce((
    SELECT jsonb_agg(DISTINCT format('%I:%s:%s', grants.table_name, grants.grantee, grants.privilege_type)
                     ORDER BY format('%I:%s:%s', grants.table_name, grants.grantee, grants.privilege_type))
    FROM information_schema.role_table_grants AS grants
    JOIN service_only_tables AS expected USING (table_name)
    WHERE grants.table_schema = 'public'
      AND grants.grantee IN ('anon', 'authenticated')
  ), '[]'::jsonb),
  'private_token_table_grants_to_clients', coalesce((
    SELECT jsonb_agg(DISTINCT format('%s:%s', grantee, privilege_type) ORDER BY format('%s:%s', grantee, privilege_type))
    FROM information_schema.role_table_grants
    WHERE table_schema = 'private'
      AND table_name = 'integration_oauth_tokens'
      AND grantee IN ('anon', 'authenticated')
  ), '[]'::jsonb),
  'private_token_table_without_rls', coalesce((
    SELECT jsonb_agg('private.integration_oauth_tokens'::text)
    WHERE NOT coalesce((
      SELECT relation.relrowsecurity
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'private' AND relation.relname = 'integration_oauth_tokens'
    ), false)
  ), '[]'::jsonb),
  'policies_with_unoptimized_auth_uid', coalesce((
    SELECT jsonb_agg(format('%I.%I:%I', schemaname, tablename, policyname)
                     ORDER BY schemaname, tablename, policyname)
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        regexp_replace(
          coalesce(qual, ''),
          '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
          '',
          'gi'
        ) ~ 'auth[.]uid[(][)]'
        OR regexp_replace(
          coalesce(with_check, ''),
          '[(][[:space:]]*select[[:space:]]+auth[.]uid[(][)][[:space:]]*(as[[:space:]]+uid)?[[:space:]]*[)]',
          '',
          'gi'
        ) ~ 'auth[.]uid[(][)]'
      )
  ), '[]'::jsonb),
  'memberships_without_roles', (SELECT count(*) FROM public.workspace_users WHERE role_id IS NULL),
  'legacy_role_table', to_regclass('public.user_roles'),
  'exposed_oauth_secret_columns', coalesce((
    SELECT jsonb_agg(format('%I.%I', table_name, column_name) ORDER BY table_name, column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('youtube_connections', 'zoom_connections')
      AND column_name IN ('access_token', 'refresh_token')
  ), '[]'::jsonb),
  'legacy_oauth_token_mutation_functions', coalesce((
    SELECT jsonb_agg(signature ORDER BY signature)
    FROM (
      VALUES
        ('public.save_integration_oauth_tokens(text,uuid,text,text,timestamptz)'),
        ('public.delete_integration_oauth_tokens(text,uuid)'),
        ('public.compare_and_swap_integration_oauth_tokens(text,uuid,text,text,text,timestamptz)')
    ) AS legacy(signature)
    WHERE to_regprocedure(signature) IS NOT NULL
  ), '[]'::jsonb),
  'anonymous_table_grants', coalesce((
    SELECT jsonb_agg(DISTINCT format('%I:%s', table_name, privilege_type)
                     ORDER BY format('%I:%s', table_name, privilege_type))
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'
  ), '[]'::jsonb),
  'missing_tracked_reliability_migration', NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260805120000' AND name = 'api_reliability_hardening'
  ),
  'recorded_migrations', coalesce((
    SELECT jsonb_agg(version || '_' || name ORDER BY version)
    FROM supabase_migrations.schema_migrations
  ), '[]'::jsonb)
) AS schema_drift_report;
