-- Read-only drift report for the current MoC Console Supabase target.
-- Every array should be empty. Run before applying the convergence script.

WITH expected_tables(name) AS (
  VALUES
    ('booking_items'), ('bookings'), ('bug_reports'),
    ('checklist_item_assignees'), ('checklist_items'),
    ('checklist_sections'), ('checklist_templates'), ('checklists'),
    ('equipment'), ('notification_deliveries'),
    ('notification_message_templates'), ('notification_outbox'),
    ('notification_recipients'), ('notification_routes'),
    ('notification_settings'), ('request_activity'),
    ('request_assignees'), ('request_comments'), ('requests'), ('roles'),
    ('streams'), ('telegram_group_topics'), ('telegram_groups'),
    ('telegram_link_tokens'), ('template_items'), ('template_sections'),
    ('users'), ('workspace_join_requests'), ('workspace_users'),
    ('workspaces'), ('youtube_connections'), ('zoom_connections'),
    ('zoom_meetings')
),
actual_tables AS (
  SELECT relation.relname AS name, relation.relrowsecurity AS rls_enabled
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relkind IN ('r', 'p')
),
public_functions AS (
  SELECT procedure.oid, procedure.oid::regprocedure::text AS signature,
         procedure.proname, procedure.proconfig
  FROM pg_proc AS procedure
  JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
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
    SELECT jsonb_agg(name ORDER BY name)
    FROM actual_tables
    WHERE NOT rls_enabled
  ), '[]'::jsonb),
  'memberships_without_roles', (
    SELECT count(*) FROM public.workspace_users WHERE role_id IS NULL
  ),
  'legacy_role_table', to_regclass('public.user_roles'),
  'exposed_oauth_secret_columns', coalesce((
    SELECT jsonb_agg(format('%I.%I', table_name, column_name) ORDER BY table_name, column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('youtube_connections', 'zoom_connections')
      AND column_name IN ('access_token', 'refresh_token')
  ), '[]'::jsonb),
  'anonymous_table_grants', coalesce((
    SELECT jsonb_agg(DISTINCT format('%I:%s', table_name, privilege_type) ORDER BY format('%I:%s', table_name, privilege_type))
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'
  ), '[]'::jsonb),
  'functions_with_mutable_search_path', coalesce((
    SELECT jsonb_agg(signature ORDER BY signature)
    FROM public_functions
    WHERE NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(proconfig, ARRAY[]::text[])) AS setting
      WHERE setting LIKE 'search_path=%'
    )
  ), '[]'::jsonb),
  'maintenance_rpcs_exposed_to_clients', coalesce((
    SELECT jsonb_agg(signature ORDER BY signature)
    FROM public_functions
    WHERE proname IN (
      'archive_completed_requests', 'archive_returned_bookings',
      'claim_stale_bookings', 'claim_stale_requests'
    )
      AND (
        has_function_privilege('anon', oid, 'EXECUTE')
        OR has_function_privilege('authenticated', oid, 'EXECUTE')
      )
  ), '[]'::jsonb),
  'recorded_migrations', coalesce((
    SELECT jsonb_agg(version || '_' || name ORDER BY version)
    FROM supabase_migrations.schema_migrations
  ), '[]'::jsonb)
) AS schema_drift_report;
