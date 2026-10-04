DO $$ DECLARE p timestamp_upgrade_probe; o scheduled_message_occurrences; BEGIN
 SELECT * INTO STRICT p FROM timestamp_upgrade_probe;
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE id=p.occurrence;
 IF o.send_on<>p.old_send OR o.expires_at<>p.old_expiry OR o.telegram_message_id<>8888 OR o.state<>'sent' THEN RAISE EXCEPTION 'Timestamp migration changed existing message identity or instants'; END IF;
 IF o.fields ? 'date' OR (SELECT fields ? 'date' FROM scheduled_message_templates WHERE id=p.template) OR (SELECT fields ? 'date' FROM scheduled_message_schedules WHERE id=p.schedule) THEN RAISE EXCEPTION 'Old content-date override survived'; END IF;
 IF NOT EXISTS(SELECT 1 FROM scheduled_message_responses WHERE occurrence_id=o.id AND status='attending' AND arrival_time='07:15') THEN RAISE EXCEPTION 'Migration lost personal attendance'; END IF;
 IF NOT EXISTS(SELECT 1 FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='edit') THEN RAISE EXCEPTION 'Migration did not queue the existing card for refresh'; END IF;
END $$;
DELETE FROM scheduled_message_occurrences WHERE id=(SELECT occurrence FROM timestamp_upgrade_probe);
DELETE FROM scheduled_message_schedules WHERE id=(SELECT schedule FROM timestamp_upgrade_probe);
DELETE FROM scheduled_message_templates WHERE id=(SELECT template FROM timestamp_upgrade_probe);
DROP TABLE timestamp_upgrade_probe;
