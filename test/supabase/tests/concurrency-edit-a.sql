BEGIN;
SET LOCAL ROLE service_role;
SELECT id FROM public.scheduled_message_occurrences WHERE id=:'occurrence'::uuid FOR UPDATE;
\echo REVISION_LOCKED
SELECT public.change_scheduled_occurrence(:'actor'::uuid, :'occurrence'::uuid, :'revision'::integer, 'title', 'Parallel winner');
SELECT pg_sleep(0.5);
COMMIT;
