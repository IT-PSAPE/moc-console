export const publicTables = [
  'bookings', 'booking_items', 'broadcasts', 'broadcast_items', 'checklist_templates',
  'checklists', 'checklist_sections', 'checklist_items', 'checklist_item_assignees',
  'api_rate_limit_windows', 'equipment', 'notification_deliveries', 'notification_ingest_replays',
  'notification_message_templates', 'notification_outbox', 'notification_routes',
  'notification_settings', 'request_activity', 'request_assignees', 'request_categories',
  'request_comments', 'requests', 'roles', 'streams', 'telegram_groups', 'telegram_group_topics',
  'telegram_link_tokens', 'telegram_webhook_updates', 'template_sections',
  'scheduled_message_occurrences', 'scheduled_message_responses', 'scheduled_message_schedules',
  'scheduled_message_series_changes', 'scheduled_message_sessions', 'scheduled_message_templates',
  'template_items', 'users', 'venue_booking_slots', 'venue_bookings', 'venue_events', 'venues',
  'workspace_join_requests', 'workspace_member_types', 'workspace_users', 'workspaces',
  'youtube_connections', 'zoom_connections', 'zoom_meetings',
];

export const tables = [
  ...publicTables.map((name) => ({ sourceSchema: 'public', targetSchema: 'public', name })),
  { sourceSchema: 'private', targetSchema: 'moc_private', name: 'integration_oauth_tokens' },
];

export const sourcePublicExclusions = new Set([
  'schema_migrations', 'broadcast_revision_counters', 'broadcast_revisions',
]);
export const sourcePrivateExclusions = new Set();
export const baselineCounts = new Map([
  ['request_categories', 5], ['roles', 3], ['workspace_member_types', 1], ['workspaces', 1],
]);
export const pageSize = 500;

export function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function qualifiedName(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

export function tableLabel(table) {
  return `${table.sourceSchema}.${table.name}`;
}

export function targetTableLabel(table) {
  return `${table.targetSchema}.${table.name}`;
}
