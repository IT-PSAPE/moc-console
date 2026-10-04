DO $$ DECLARE p telegram_roster_upgrade_probe; o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT p FROM telegram_roster_upgrade_probe;
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p.occurrence;
 IF o.expires_at<>p.old_expiry OR o.telegram_message_id<>9999 OR o.state<>'sent' OR NOT o.roster_frozen OR o.revision<>2 THEN RAISE EXCEPTION 'Roster cleanup changed identity/expiry or did not revise the card'; END IF;
 IF EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id='20000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Unlinked unanswered entry survived migration'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id='20000000-0000-4000-8000-000000000003' AND status='attending' AND arrival_time='07:15') THEN RAISE EXCEPTION 'Migration removed a saved response after Telegram disconnection'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id='20000000-0000-4000-8000-000000000001' AND status='not_attending') THEN RAISE EXCEPTION 'Migration removed a saved decline'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND user_id='20000000-0000-4000-8000-000000000002' AND status='awaiting') THEN RAISE EXCEPTION 'Migration removed a linked pending response'; END IF;
 IF NOT EXISTS(SELECT 1 FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='edit' AND status='pending') THEN RAISE EXCEPTION 'Roster cleanup did not queue an in-place Telegram refresh'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=p.expired_occurrence AND user_id='20000000-0000-4000-8000-000000000004') THEN RAISE EXCEPTION 'Migration altered expired roster history'; END IF;
 IF has_function_privilege('authenticated','public.begin_scheduled_delivery(uuid)','EXECUTE') OR has_function_privilege('anon','public.begin_scheduled_delivery(uuid)','EXECUTE') OR NOT has_function_privilege('service_role','public.begin_scheduled_delivery(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Roster delivery RPC permissions changed'; END IF;
END $$;
UPDATE users SET telegram_chat_id='tg-viewer' WHERE id='20000000-0000-4000-8000-000000000003';
UPDATE users SET telegram_chat_id='tg-admin' WHERE id='20000000-0000-4000-8000-000000000001';
DELETE FROM scheduled_message_occurrences WHERE schedule_id=(SELECT schedule FROM telegram_roster_upgrade_probe);
DELETE FROM scheduled_message_schedules WHERE id=(SELECT schedule FROM telegram_roster_upgrade_probe);
DELETE FROM scheduled_message_templates WHERE id=(SELECT template FROM telegram_roster_upgrade_probe);
DROP TABLE telegram_roster_upgrade_probe;
