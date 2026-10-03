BEGIN;
SET LOCAL ROLE service_role;
SELECT public.request_scheduled_send(:'actor'::uuid, :'occurrence'::uuid);
COMMIT;
