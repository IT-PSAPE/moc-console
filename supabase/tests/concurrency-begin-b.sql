BEGIN;
SET LOCAL ROLE service_role;
SELECT public.begin_scheduled_delivery(:'delivery'::uuid);
COMMIT;
