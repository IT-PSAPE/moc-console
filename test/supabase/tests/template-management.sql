\ir assert-rejected.sql
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE
 actor uuid := '20000000-0000-4000-8000-000000000002';
 workspace uuid := '10000000-0000-4000-8000-000000000001';
 creation uuid := '30000000-0000-4000-8000-000000000099';
 payload jsonb := jsonb_build_object('creationId',creation,'name','Retry-safe template','messageType','announcement','body','{{title}}','fields',jsonb_build_object('title','Morning','instructions','Bring equipment'));
 first_id uuid; second_id uuid; schedule uuid; occurrence uuid;
 foreign_id uuid := '30000000-0000-4000-8000-000000000098';
BEGIN
 first_id := public.save_scheduled_template(actor,workspace,payload);
 second_id := public.save_scheduled_template(actor,workspace,payload);
 IF first_id <> second_id OR first_id <> creation THEN
  RAISE EXCEPTION 'Retrying template creation must preserve one identity';
 END IF;
 IF (SELECT count(*) FROM public.scheduled_message_templates WHERE name='Retry-safe template')<>1 THEN
  RAISE EXCEPTION 'Retrying template creation must not insert duplicates';
 END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',actor,'10000000-0000-4000-8000-000000000002',payload::text),'Not authorised');
 INSERT INTO public.scheduled_message_templates(id,workspace_id,name,message_type,body,fields)
 VALUES(foreign_id,'10000000-0000-4000-8000-000000000002','Other workspace template','announcement','Hi','{"title":"Hi"}');
 PERFORM pg_temp.assert_rejected(format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',actor,workspace,(payload || jsonb_build_object('creationId',foreign_id))::text),'Template unavailable in this workspace');
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_template(%L,%L,%L)',actor,workspace,foreign_id),'Template unavailable in this workspace');
 schedule := public.create_scheduled_schedule(actor,workspace,jsonb_build_object('templateId',first_id,'groupChatId','-1000000000001','startsOn',current_date,'frequency','once','autoSend',false,'expiryHours',72));
 SELECT id INTO STRICT occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=schedule;
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_template(%L,%L,%L)','20000000-0000-4000-8000-000000000003',workspace,first_id),'Not authorised');
 PERFORM pg_temp.assert_rejected(format('SELECT public.delete_scheduled_template(%L,%L,%L)',actor,'10000000-0000-4000-8000-000000000002',first_id),'Not authorised');
 PERFORM public.delete_scheduled_template(actor,workspace,first_id);
 PERFORM public.delete_scheduled_template(actor,workspace,first_id);
 IF (SELECT deleted_at FROM public.scheduled_message_templates WHERE id=first_id) IS NULL THEN
  RAISE EXCEPTION 'Deleting a template must remove it from the active library';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_schedules WHERE id=schedule AND enabled)
   OR NOT EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE id=occurrence AND fields->>'title'='Morning') THEN
  RAISE EXCEPTION 'Deleting a template must preserve existing schedules and occurrences';
 END IF;
 PERFORM pg_temp.assert_rejected(format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',actor,workspace,payload::text),'Template unavailable in this workspace');
 PERFORM pg_temp.assert_rejected(format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',actor,workspace,(payload - 'creationId' || jsonb_build_object('id',first_id))::text),'Template unavailable in this workspace');
 PERFORM pg_temp.assert_rejected(format('SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',actor,workspace,jsonb_build_object('templateId',first_id,'groupChatId','-1000000000001','startsOn',current_date,'frequency','once','autoSend',false)::text),'Template unavailable in this workspace');
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.scheduled_message_templates WHERE id='30000000-0000-4000-8000-000000000099') THEN
  RAISE EXCEPTION 'Deleted templates must be hidden by RLS';
 END IF;
 IF has_function_privilege('authenticated','public.delete_scheduled_template(uuid,uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Clients must not invoke service-only template deletion directly';
 END IF;
END $$;
ROLLBACK;
