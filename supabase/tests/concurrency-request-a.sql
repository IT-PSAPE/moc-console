BEGIN;
SET LOCAL ROLE service_role;
SELECT id FROM public.scheduled_message_occurrences WHERE id=:'occurrence' FOR UPDATE;
\echo REQUEST_LOCKED
SELECT public.request_scheduled_send(:'actor'::uuid, :'occurrence'::uuid);
SELECT pg_sleep(0.5);
COMMIT;
