-- Stable local actors and workspaces. These are created before the migrations
-- so the member-type migration must backfill their memberships.
INSERT INTO public.roles (id, name, can_read, can_update, can_manage_roles)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin', true, true, true),
  ('00000000-0000-4000-8000-000000000002', 'editor', true, true, false),
  ('00000000-0000-4000-8000-000000000003', 'viewer', true, false, false);

INSERT INTO public.workspaces (id, name, slug)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Lifecycle Test', 'lifecycle-test'),
  ('10000000-0000-4000-8000-000000000002', 'Other Workspace', 'other-workspace');

INSERT INTO auth.users (id, email)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'admin@example.test'),
  ('20000000-0000-4000-8000-000000000002', 'editor@example.test'),
  ('20000000-0000-4000-8000-000000000003', 'viewer@example.test'),
  ('20000000-0000-4000-8000-000000000004', 'unlinked@example.test'),
  ('20000000-0000-4000-8000-000000000006', 'volunteer@example.test');

INSERT INTO public.users (id, name, surname, email, telegram_chat_id)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Ada', 'Admin', 'admin@example.test', 'tg-admin'),
  ('20000000-0000-4000-8000-000000000002', 'Eli', 'Editor', 'editor@example.test', 'tg-editor'),
  ('20000000-0000-4000-8000-000000000003', 'Val', 'Viewer', 'viewer@example.test', 'tg-viewer'),
  ('20000000-0000-4000-8000-000000000004', 'Uma', 'Unlinked', 'unlinked@example.test', NULL),
  ('20000000-0000-4000-8000-000000000006', 'Vee', 'Volunteer', 'volunteer@example.test', 'tg-volunteer');

INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
VALUES
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003');

INSERT INTO public.telegram_groups (chat_id, title, type, is_forum, active, workspace_id)
VALUES
  ('-1000000000001', 'Lifecycle Group', 'supergroup', true, true, '10000000-0000-4000-8000-000000000001'),
  ('-1000000000002', 'Other Workspace Group', 'supergroup', false, true, '10000000-0000-4000-8000-000000000002');

INSERT INTO public.telegram_group_topics (group_chat_id, thread_id, name)
VALUES ('-1000000000001', 42, 'Attendance');
