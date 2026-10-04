-- Stable identities and workspace data for local scheduled-message SQL tests.

INSERT INTO public.workspaces (id, name, slug)
VALUES ('10000000-0000-4000-8000-000000000002', 'Other Workspace', 'other-workspace');

INSERT INTO moc_auth."user" (id, name, email, surname)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Ada', 'admin@example.test', 'Admin'),
  ('20000000-0000-4000-8000-000000000002', 'Eli', 'editor@example.test', 'Editor'),
  ('20000000-0000-4000-8000-000000000003', 'Val', 'viewer@example.test', 'Viewer'),
  ('20000000-0000-4000-8000-000000000004', 'Uma', 'unlinked@example.test', 'Unlinked'),
  ('20000000-0000-4000-8000-000000000006', 'Vee', 'volunteer@example.test', 'Volunteer');

INSERT INTO public.users (id, name, surname, email, telegram_chat_id)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Ada', 'Admin', 'admin@example.test', 'tg-admin'),
  ('20000000-0000-4000-8000-000000000002', 'Eli', 'Editor', 'editor@example.test', 'tg-editor'),
  ('20000000-0000-4000-8000-000000000003', 'Val', 'Viewer', 'viewer@example.test', 'tg-viewer'),
  ('20000000-0000-4000-8000-000000000004', 'Uma', 'Unlinked', 'unlinked@example.test', NULL),
  ('20000000-0000-4000-8000-000000000006', 'Vee', 'Volunteer', 'volunteer@example.test', 'tg-volunteer');

INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
SELECT workspace_row.id, user_row.id, role_row.id
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001'::uuid, 'admin'::text),
  ('20000000-0000-4000-8000-000000000002'::uuid, 'editor'::text),
  ('20000000-0000-4000-8000-000000000003'::uuid, 'viewer'::text),
  ('20000000-0000-4000-8000-000000000004'::uuid, 'viewer'::text),
  ('20000000-0000-4000-8000-000000000006'::uuid, 'viewer'::text)
) AS fixture(user_id, role_name)
JOIN public.workspaces AS workspace_row ON workspace_row.slug = 'default-workspace'
JOIN public.users AS user_row ON user_row.id = fixture.user_id
JOIN public.roles AS role_row ON role_row.name = fixture.role_name;
INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
SELECT '10000000-0000-4000-8000-000000000002', user_row.id, role_row.id
FROM public.users AS user_row CROSS JOIN public.roles AS role_row
WHERE user_row.id = '20000000-0000-4000-8000-000000000002' AND role_row.name = 'viewer';

INSERT INTO public.telegram_groups (chat_id, title, type, is_forum, active, workspace_id)
VALUES
  ('-1000000000001', 'Lifecycle Group', 'supergroup', true, true, (SELECT id FROM public.workspaces WHERE slug = 'default-workspace')),
  ('-1000000000002', 'Other Workspace Group', 'supergroup', false, true, '10000000-0000-4000-8000-000000000002');
INSERT INTO public.telegram_group_topics (group_chat_id, thread_id, name)
VALUES ('-1000000000001', 42, 'Attendance');
