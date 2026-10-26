-- DocEditor serializes an ordered array of plain text strings. Decode only
-- that known format; every other historical payload is rendered literally.
CREATE OR REPLACE FUNCTION moc_private.discussion_plain_text(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE parsed jsonb; result text;
BEGIN
 IF p_value IS NULL OR btrim(p_value)='' THEN RETURN NULL; END IF;
 BEGIN
  parsed := p_value::jsonb;
 EXCEPTION WHEN invalid_text_representation THEN RETURN p_value;
 END;
 IF jsonb_typeof(parsed)<>'array' THEN RETURN p_value; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(parsed) AS entries(value) WHERE jsonb_typeof(value)<>'string') THEN RETURN p_value; END IF;
 SELECT string_agg(value#>>'{}',E'\n' ORDER BY position) INTO result
 FROM jsonb_array_elements(parsed) WITH ORDINALITY AS entries(value,position);
 RETURN coalesce(nullif(result,''),p_value);
END $$;
REVOKE ALL ON FUNCTION moc_private.discussion_plain_text(text) FROM PUBLIC,moc_app,moc_public,moc_worker;
