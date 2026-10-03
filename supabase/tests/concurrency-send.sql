BEGIN;
SET LOCAL ROLE service_role;
UPDATE public.notification_deliveries SET status='processing'
WHERE scheduled_occurrence_id=:'occurrence'::uuid AND scheduled_operation='send';
SELECT public.begin_scheduled_delivery(id) FROM public.notification_deliveries
WHERE scheduled_occurrence_id=:'occurrence'::uuid AND scheduled_operation='send';
SELECT public.finish_scheduled_delivery(
  (SELECT id FROM public.notification_deliveries WHERE scheduled_occurrence_id=:'occurrence'::uuid AND scheduled_operation='send'),
  (SELECT revision FROM public.scheduled_message_occurrences WHERE id=:'occurrence'::uuid),
  77001
);
COMMIT;
