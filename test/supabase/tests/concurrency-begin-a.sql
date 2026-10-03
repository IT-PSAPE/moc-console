BEGIN;
SET LOCAL ROLE service_role;
SELECT public.begin_scheduled_delivery(:'delivery'::uuid);
\echo DELIVERY_LEASE_HELD
SELECT pg_sleep(0.5);
COMMIT;
