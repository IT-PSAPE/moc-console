BEGIN;

-- Migration-only helpers preserve existing guidance without keeping a third
-- editable field. Personal attendee arrival_time values are not changed.
CREATE FUNCTION pg_temp.instructions_with_arrival(p_instructions text,p_arrival text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE result text:=coalesce(p_instructions,''); note text; BEGIN
 IF coalesce(trim(p_arrival),'')='' THEN RETURN result; END IF;
 note:='Please arrive by ' || p_arrival || '.';
 IF position(note IN result)=0 THEN result:=concat_ws(E'\n',nullif(result,''),note); END IF;
 IF length(result)>2000 THEN RAISE EXCEPTION 'Shorten legacy pre-attendance instructions before migrating arrival guidance (maximum 2000 characters)'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION pg_temp.retire_expected_arrival(p_body text,p_fields jsonb) RETURNS TABLE(body text,fields jsonb)
LANGUAGE plpgsql AS $$
DECLARE token text:='\{\{[[:space:]]*expectedArrival[[:space:]]*\}\}'; arrival text:=coalesce(p_fields->>'expectedArrival',''); BEGIN
 fields:=p_fields-'expectedArrival'; body:=p_body;
 IF body ~ ('Please arrive by[[:space:]]*' || token) OR body !~ token THEN
  IF p_fields ? 'expectedArrival' THEN fields:=jsonb_set(fields,'{instructions}',to_jsonb(pg_temp.instructions_with_arrival(p_fields->>'instructions',arrival))); END IF;
  body:=rtrim(regexp_replace(body,'[[:space:]]*Please arrive by[[:space:]]*' || token || '[.]?','','g'),E'\n');
 END IF;
 -- Custom layouts retain their wording and render the old value as literal text.
 body:=regexp_replace(body,token,arrival,'g');
 RETURN NEXT;
END $$;

-- Fold each effective-date boundary into instructions before removing the old
-- patches. Later instructions edits still retain the arrival guidance then in effect.
CREATE TEMP TABLE migrated_instruction_changes ON COMMIT DROP AS
SELECT dates.schedule_id,dates.effective_on,
 pg_temp.instructions_with_arrival(
  coalesce((SELECT c.value FROM public.scheduled_message_series_changes c WHERE c.schedule_id=s.id AND c.field='instructions' AND c.effective_on<=dates.effective_on ORDER BY c.effective_on DESC,c.id DESC LIMIT 1),s.fields->>'instructions'),
  coalesce((SELECT c.value FROM public.scheduled_message_series_changes c WHERE c.schedule_id=s.id AND c.field='expectedArrival' AND c.effective_on<=dates.effective_on ORDER BY c.effective_on DESC,c.id DESC LIMIT 1),s.fields->>'expectedArrival')) AS value
FROM (SELECT DISTINCT schedule_id,effective_on FROM public.scheduled_message_series_changes WHERE field IN ('instructions','expectedArrival')) dates
JOIN public.scheduled_message_schedules s ON s.id=dates.schedule_id
WHERE s.fields ? 'expectedArrival' OR EXISTS(SELECT 1 FROM public.scheduled_message_series_changes c WHERE c.schedule_id=s.id AND c.field='expectedArrival');
DELETE FROM public.scheduled_message_series_changes c WHERE field IN ('instructions','expectedArrival')
 AND EXISTS(SELECT 1 FROM migrated_instruction_changes m WHERE m.schedule_id=c.schedule_id);
INSERT INTO public.scheduled_message_series_changes(schedule_id,effective_on,field,value)
SELECT schedule_id,effective_on,'instructions',value FROM migrated_instruction_changes ORDER BY schedule_id,effective_on;

DO $$ DECLARE table_name text; token text:='\{\{[[:space:]]*expectedArrival[[:space:]]*\}\}'; BEGIN
 FOREACH table_name IN ARRAY ARRAY['scheduled_message_templates','scheduled_message_schedules'] LOOP
  EXECUTE format('UPDATE public.%I t SET body=m.body,fields=m.fields FROM (SELECT source.id,r.* FROM public.%I source CROSS JOIN LATERAL pg_temp.retire_expected_arrival(source.body,source.fields) r WHERE source.fields ? ''expectedArrival'' OR source.body ~ $1) m WHERE t.id=m.id',table_name,table_name) USING token;
 END LOOP;
END $$;
UPDATE public.scheduled_message_occurrences o SET body=m.body,fields=m.fields,revision=o.revision+1
FROM (SELECT source.id,r.* FROM public.scheduled_message_occurrences source CROSS JOIN LATERAL pg_temp.retire_expected_arrival(source.body,source.fields) r WHERE source.fields ? 'expectedArrival' OR source.body ~ '\{\{[[:space:]]*expectedArrival[[:space:]]*\}\}') m
WHERE o.id=m.id;

DELETE FROM public.scheduled_message_sessions WHERE kind='admin' AND data->>'field'='expectedArrival';
-- Queue edits through the existing outbox; keep original Telegram message IDs.
DO $$ DECLARE occurrence uuid; BEGIN
 FOR occurrence IN SELECT id FROM public.scheduled_message_occurrences WHERE state='sent' AND expires_at>clock_timestamp() AND revision>synced_revision LOOP
  PERFORM private.queue_scheduled_message(occurrence,'edit');
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.scheduled_validate_fields(p_type text,p_fields jsonb) RETURNS void
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE k text; v jsonb; BEGIN
 IF p_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
 IF jsonb_typeof(p_fields)<>'object' OR coalesce(length(trim(p_fields->>'title')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid message title'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
  IF jsonb_typeof(v)<>'string' OR k NOT IN ('title','instructions') THEN RAISE EXCEPTION 'Field is not editable'; END IF;
  IF k='instructions' AND length(p_fields->>k)>2000 THEN RAISE EXCEPTION 'Instructions too long'; END IF;
 END LOOP;
END $$;
COMMIT;
