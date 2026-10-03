\ir assert-rejected.sql
DO $$
DECLARE
 template uuid; schedule uuid; occurrence uuid; actor uuid := '20000000-0000-4000-8000-000000000002';
 workspace uuid := '10000000-0000-4000-8000-000000000001';
BEGIN
 SELECT id INTO STRICT template FROM public.scheduled_message_templates WHERE name='Legacy arrival migration';
 SELECT id INTO STRICT schedule FROM public.scheduled_message_schedules WHERE template_id=template;
 IF EXISTS(SELECT 1 FROM public.scheduled_message_templates WHERE fields ? 'expectedArrival')
  OR EXISTS(SELECT 1 FROM public.scheduled_message_schedules WHERE fields ? 'expectedArrival')
  OR EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE fields ? 'expectedArrival')
  OR EXISTS(SELECT 1 FROM public.scheduled_message_series_changes WHERE field='expectedArrival') THEN
  RAISE EXCEPTION 'Retired arrival fields and recurring overrides must be removed';
 END IF;
 IF (SELECT fields->>'instructions' FROM public.scheduled_message_templates WHERE id=template)<>E'Meet at the entrance\nPlease arrive by 08:00.'
  OR (SELECT body FROM public.scheduled_message_templates WHERE id=template)<>E'<b>{{title}}</b>\n{{instructions}}' THEN
  RAISE EXCEPTION 'Legacy default arrival guidance must move into instructions';
 END IF;
 IF (SELECT body FROM public.scheduled_message_templates WHERE name='Custom legacy arrival migration')<>E'{{title}}\n{{instructions}}\nDoors open: 18:00' THEN
  RAISE EXCEPTION 'Custom template layout must preserve its literal arrival guidance';
 END IF;
 IF (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+1)<>E'Meet at the entrance\nPlease arrive by 07:30.'
  OR (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date+2)<>E'Use the side entrance\nPlease arrive by 07:30.' THEN
  RAISE EXCEPTION 'Each occurrence must retain its effective instructions and arrival guidance';
 END IF;
 SELECT id INTO STRICT occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=current_date;
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND status='attending' AND arrival_time='09:15')
  OR (SELECT telegram_message_id FROM public.scheduled_message_occurrences WHERE id=occurrence)<>99123 THEN
  RAISE EXCEPTION 'Migration must preserve personal arrival responses and Telegram message identity';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=occurrence AND scheduled_operation='edit' AND status='pending') THEN
  RAISE EXCEPTION 'Sent active occurrences must queue synchronization of their existing message';
 END IF;
 IF EXISTS(SELECT 1 FROM public.scheduled_message_sessions WHERE telegram_user_id='migration-admin')
  OR NOT EXISTS(SELECT 1 FROM public.scheduled_message_sessions WHERE telegram_user_id='migration-attendee') THEN
  RAISE EXCEPTION 'Retired-field admin sessions must close without deleting attendance input sessions';
 END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT private.scheduled_validate_fields(%L,%L::jsonb)','pre_attendance','{"title":"Morning","expectedArrival":"07:30"}'),'Field is not editable');
 PERFORM public.respond_scheduled_attendance('20000000-0000-4000-8000-000000000003',occurrence,(SELECT revision FROM public.scheduled_message_occurrences WHERE id=occurrence),'attending','09:30');
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=occurrence AND arrival_time='09:30') THEN
  RAISE EXCEPTION 'Attendees must still be able to update personal arrival times after migration';
 END IF;
END $$;
BEGIN;
-- Generate a previously unmaterialized date: retired time patches must now
-- resolve through instructions, even beyond the daily worker's normal horizon.
UPDATE public.scheduled_message_schedules SET frequency='once',starts_on=current_date+40
WHERE template_id=(SELECT id FROM public.scheduled_message_templates WHERE name='Legacy arrival migration');
SELECT public.materialize_scheduled_messages(id) FROM public.scheduled_message_schedules
WHERE template_id=(SELECT id FROM public.scheduled_message_templates WHERE name='Legacy arrival migration');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE occurrence_on=current_date+40
  AND fields->>'instructions'=E'Use the side entrance\nPlease arrive by 06:00.') THEN
  RAISE EXCEPTION 'Future occurrences must retain migrated recurring arrival guidance';
 END IF;
END $$;
ROLLBACK;
