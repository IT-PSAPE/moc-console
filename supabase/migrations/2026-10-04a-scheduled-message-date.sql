  BEGIN;

  -- Date is an optional calendar value in the existing JSON fields. Store its
  -- Gregorian YYYY-MM-DD value; the shared renderer converts the displayed year.
  -- Existing templates, schedules, responses and Telegram IDs are unchanged.
  CREATE OR REPLACE FUNCTION private.scheduled_validate_fields(p_type text,p_fields jsonb) RETURNS void
  LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
  DECLARE k text; v jsonb; calendar_date date; date_value text; BEGIN
   IF p_type NOT IN ('announcement','pre_attendance') THEN RAISE EXCEPTION 'Invalid message type'; END IF;
   IF jsonb_typeof(p_fields)<>'object' OR coalesce(length(trim(p_fields->>'title')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid message title'; END IF;
   FOR k,v IN SELECT * FROM jsonb_each(p_fields) LOOP
    IF jsonb_typeof(v)<>'string' OR k NOT IN ('title','instructions','date') THEN RAISE EXCEPTION 'Field is not editable'; END IF;
    IF k='instructions' AND length(p_fields->>k)>2000 THEN RAISE EXCEPTION 'Instructions too long'; END IF;
    IF k='date' THEN
     date_value:=p_fields->>k;
     IF date_value<>'' THEN
      IF date_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Invalid calendar date: use YYYY-MM-DD'; END IF;
      BEGIN
       calendar_date:=date_value::date;
      EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid calendar date'; END;
      IF to_char(calendar_date,'YYYY-MM-DD')<>date_value THEN RAISE EXCEPTION 'Invalid calendar date'; END IF;
     END IF;
    END IF;
   END LOOP;
  END $$;
  COMMIT;
