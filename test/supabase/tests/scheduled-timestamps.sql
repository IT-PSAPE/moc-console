BEGIN;
\ir assert-rejected.sql
DO $$
DECLARE actor uuid:='20000000-0000-4000-8000-000000000002'; viewer uuid:='20000000-0000-4000-8000-000000000003'; workspace uuid:='10000000-0000-4000-8000-000000000001'; template uuid; schedule uuid; one_off uuid; o scheduled_message_occurrences; next_o scheduled_message_occurrences; send_at timestamptz:=clock_timestamp()+interval '4 hours'; expiry_at timestamptz:=send_at+interval '28 hours 35 minutes'; q uuid; snapshot jsonb;
BEGIN
 PERFORM pg_temp.assert_rejected('SELECT private.scheduled_validate_fields(''announcement'',''{"title":"Service","date":"2026-10-04"}'')','Field is not editable');
 PERFORM pg_temp.assert_rejected('SELECT private.scheduled_validate_fields(''announcement'',''{"title":"Service","time":"18:30"}'')','Field is not editable');
 template:=public.save_scheduled_template(actor,workspace,'{"name":"Timestamp test","messageType":"announcement","body":"{{title}} {{date}} {{time}}","fields":{"title":"Service"},"audience":[]}');
 schedule:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',send_at,'expiresAt',expiry_at,'frequency','daily','autoSend',true));
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE schedule_id=schedule ORDER BY occurrence_on LIMIT 1;
 SELECT * INTO STRICT next_o FROM scheduled_message_occurrences WHERE schedule_id=schedule AND occurrence_on=o.occurrence_on+1;
 IF abs(extract(epoch FROM (o.send_on-send_at)))>0.01 OR abs(extract(epoch FROM (o.expires_at-expiry_at)))>0.01 THEN RAISE EXCEPTION 'Initial send and expiry must retain exact instants'; END IF;
 IF (next_o.send_on AT TIME ZONE 'Africa/Johannesburg')::time<>(o.send_on AT TIME ZONE 'Africa/Johannesburg')::time OR next_o.expires_at-next_o.send_on<>o.expires_at-o.send_on THEN RAISE EXCEPTION 'Recurring timing must advance with each occurrence'; END IF;
 PERFORM public.prepare_scheduled_messages();
 IF EXISTS(SELECT 1 FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send') THEN RAISE EXCEPTION 'Future same-day message was queued early'; END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''expiresAt'',%L)',viewer,o.id,o.revision,(expiry_at+interval '1 hour')::text),'Not authorised');
 PERFORM public.change_scheduled_occurrence(actor,o.id,o.revision,'sendOn',(send_at+interval '1 hour')::text);
 IF (SELECT expires_at FROM scheduled_message_occurrences WHERE id=o.id)<>o.expires_at THEN RAISE EXCEPTION 'Rescheduling must not reset expiry'; END IF;
 PERFORM public.change_scheduled_occurrence(actor,o.id,o.revision+1,'expiresAt',(expiry_at+interval '2 hours')::text);
 IF (SELECT expires_at FROM scheduled_message_occurrences WHERE id=next_o.id)<>next_o.expires_at THEN RAISE EXCEPTION 'Occurrence expiry edit changed a future occurrence'; END IF;
 PERFORM public.change_scheduled_occurrence(actor,next_o.id,next_o.revision,'expiryHours','30.5','future');
 IF (SELECT expires_at-send_on FROM scheduled_message_occurrences WHERE id=next_o.id)<>interval '30 hours 30 minutes' THEN RAISE EXCEPTION 'Fractional series duration lost minutes'; END IF;
 one_off:=public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',clock_timestamp()-interval '1 minute','expiresAt',clock_timestamp()+interval '10 minutes','frequency','once','autoSend',true));
 SELECT * INTO STRICT o FROM scheduled_message_occurrences WHERE schedule_id=one_off;
 PERFORM public.prepare_scheduled_messages();
 SELECT id INTO STRICT q FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='send';
 UPDATE notification_deliveries SET status='processing' WHERE id=q;
 snapshot:=public.begin_scheduled_delivery(q);
 IF snapshot->>'timezone'<>'Africa/Johannesburg' OR (snapshot->'occurrence'->>'expires_at')::timestamptz<>o.expires_at THEN RAISE EXCEPTION 'Delivery snapshot missing source expiry/timezone'; END IF;
 PERFORM public.finish_scheduled_delivery(q,o.revision,9191);
 PERFORM public.change_scheduled_occurrence(actor,o.id,o.revision,'expiresAt',(o.expires_at+interval '1 minute')::text);
 IF (SELECT telegram_message_id FROM scheduled_message_occurrences WHERE id=o.id)<>9191 OR NOT EXISTS(SELECT 1 FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='edit') THEN RAISE EXCEPTION 'Sent expiry edit must update same message'; END IF;
 UPDATE scheduled_message_occurrences SET expires_at=clock_timestamp()-interval '1 second' WHERE id=o.id;
 PERFORM public.prepare_scheduled_messages();
 IF NOT EXISTS(SELECT 1 FROM notification_deliveries WHERE scheduled_occurrence_id=o.id AND scheduled_operation='expire') THEN RAISE EXCEPTION 'Expiry cleanup was not queued'; END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''title'',''Closed'')',actor,o.id,o.revision+1),'no longer editable');
END $$;
ROLLBACK;
