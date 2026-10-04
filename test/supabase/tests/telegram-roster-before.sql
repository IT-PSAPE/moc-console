-- Active legacy cards contain unanswered members who cannot respond in Telegram.
CREATE TABLE public.telegram_roster_upgrade_probe AS
WITH saved AS (
 SELECT public.save_scheduled_template('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',jsonb_build_object('name','Telegram roster upgrade','messageType','pre_attendance','body','{{title}}','fields',jsonb_build_object('title','Existing service'),'audience',jsonb_build_array((SELECT id FROM workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND is_default)))) AS template
), created AS (
 SELECT template,public.create_scheduled_schedule('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',jsonb_build_object('templateId',template,'groupChatId','-1000000000001','startsOn',clock_timestamp(),'frequency','once','autoSend',false,'expiryHours',72)) AS schedule FROM saved
) SELECT * FROM created;
UPDATE scheduled_message_occurrences SET state='sent',telegram_message_id=9999,roster_frozen=true WHERE schedule_id=(SELECT schedule FROM telegram_roster_upgrade_probe);
INSERT INTO scheduled_message_responses(occurrence_id,user_id,name,status,arrival_time)
 SELECT id,'20000000-0000-4000-8000-000000000003','Val Viewer','attending','07:15' FROM scheduled_message_occurrences WHERE schedule_id=(SELECT schedule FROM telegram_roster_upgrade_probe);
INSERT INTO scheduled_message_responses(occurrence_id,user_id,name,status)
 SELECT o.id,u.id,u.name,CASE WHEN u.id='20000000-0000-4000-8000-000000000001' THEN 'not_attending' ELSE 'awaiting' END
 FROM scheduled_message_occurrences o CROSS JOIN users u
 WHERE o.schedule_id=(SELECT schedule FROM telegram_roster_upgrade_probe) AND u.id IN ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004');
UPDATE users SET telegram_chat_id=NULL WHERE id='20000000-0000-4000-8000-000000000003';
UPDATE users SET telegram_chat_id='   ' WHERE id='20000000-0000-4000-8000-000000000001';
ALTER TABLE telegram_roster_upgrade_probe ADD COLUMN occurrence uuid;
ALTER TABLE telegram_roster_upgrade_probe ADD COLUMN old_expiry timestamptz;
ALTER TABLE telegram_roster_upgrade_probe ADD COLUMN expired_occurrence uuid;
UPDATE telegram_roster_upgrade_probe p SET occurrence=o.id,old_expiry=o.expires_at FROM scheduled_message_occurrences o WHERE o.schedule_id=p.schedule;
WITH expired AS (
 INSERT INTO scheduled_message_occurrences(workspace_id,schedule_id,occurrence_on,send_on,expires_at,fields,body,message_type,audience,require_arrival,state,telegram_message_id,roster_frozen)
 SELECT workspace_id,schedule_id,occurrence_on-1,send_on-interval '1 day',clock_timestamp()-interval '1 hour',fields,body,message_type,audience,require_arrival,'sent',9998,true FROM scheduled_message_occurrences WHERE id=(SELECT occurrence FROM telegram_roster_upgrade_probe) RETURNING id
) UPDATE telegram_roster_upgrade_probe SET expired_occurrence=(SELECT id FROM expired);
INSERT INTO scheduled_message_responses(occurrence_id,user_id,name)
 SELECT expired_occurrence,'20000000-0000-4000-8000-000000000004','Uma Unlinked' FROM telegram_roster_upgrade_probe;
