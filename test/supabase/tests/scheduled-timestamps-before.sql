-- Upgrade probe: model a sent attendance message with a fixed content date.
CREATE TABLE public.timestamp_upgrade_probe AS
WITH saved AS (
 SELECT public.save_scheduled_template('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',jsonb_build_object('name','Upgrade probe','messageType','pre_attendance','body','{{title}} {{date}} {{time}}','fields',jsonb_build_object('title','Existing service','date','2026-01-01'),'audience',jsonb_build_array((SELECT id FROM workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND is_default)))) AS template
), created AS (
 SELECT template,public.create_scheduled_schedule('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',(clock_timestamp() AT TIME ZONE 'Africa/Johannesburg')::date,'frequency','once','autoSend',false,'expiryHours',72)) AS schedule FROM saved
) SELECT * FROM created;
UPDATE scheduled_message_occurrences SET state='sent',telegram_message_id=8888,roster_frozen=true WHERE schedule_id=(SELECT schedule FROM timestamp_upgrade_probe);
INSERT INTO scheduled_message_responses(occurrence_id,user_id,name,status,arrival_time)
 SELECT id,'20000000-0000-4000-8000-000000000003','Val Viewer','attending','07:15' FROM scheduled_message_occurrences WHERE schedule_id=(SELECT schedule FROM timestamp_upgrade_probe);
ALTER TABLE timestamp_upgrade_probe ADD COLUMN occurrence uuid;
ALTER TABLE timestamp_upgrade_probe ADD COLUMN old_expiry timestamptz;
ALTER TABLE timestamp_upgrade_probe ADD COLUMN old_send timestamptz;
UPDATE timestamp_upgrade_probe p SET occurrence=o.id,old_expiry=o.expires_at,old_send=o.send_on::timestamp AT TIME ZONE s.timezone FROM scheduled_message_occurrences o JOIN scheduled_message_schedules s ON s.id=o.schedule_id WHERE o.schedule_id=p.schedule;
