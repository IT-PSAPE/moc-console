BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.scheduled_message_sessions(id,user_id,telegram_user_id,workspace_id,chat_id,kind,data)
VALUES('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','tg-editor',
  '10000000-0000-4000-8000-000000000001','-1000000000001','admin','{"flow":"restarted"}')
ON CONFLICT (telegram_user_id,chat_id) DO UPDATE
SET id=EXCLUDED.id,user_id=EXCLUDED.user_id,kind=EXCLUDED.kind,data=EXCLUDED.data;
COMMIT;
