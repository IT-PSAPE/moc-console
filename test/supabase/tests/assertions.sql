DO $$
DECLARE
  v_default_type uuid;
BEGIN
  IF (SELECT count(*) FROM public.workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND is_default) <> 1 THEN
    RAISE EXCEPTION 'existing workspace must receive one default member type';
  END IF;
  SELECT id INTO v_default_type FROM public.workspace_member_types
  WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND is_default;
  IF (SELECT count(*) FROM public.workspace_users WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND member_type_id=v_default_type) <> 5 THEN
    RAISE EXCEPTION 'existing memberships must be assigned to the default member type';
  END IF;
END $$;

-- New workspaces and accepted memberships receive their workspace default.
INSERT INTO public.workspaces (id, name, slug)
VALUES ('10000000-0000-4000-8000-000000000003', 'Created After Migration', 'created-after-migration');
INSERT INTO auth.users (id, email)
VALUES ('20000000-0000-4000-8000-000000000005', 'new-member@example.test');
INSERT INTO public.users (id, name, surname, email)
VALUES ('20000000-0000-4000-8000-000000000005', 'New', 'Member', 'new-member@example.test');
INSERT INTO public.workspace_users (workspace_id, user_id, role_id)
VALUES ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000003' AND is_default) <> 1 THEN
    RAISE EXCEPTION 'new workspace must receive one default member type';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_users AS membership
    JOIN public.workspace_member_types AS member_type
      ON member_type.id=membership.member_type_id AND member_type.workspace_id=membership.workspace_id
    WHERE membership.workspace_id='10000000-0000-4000-8000-000000000003'
      AND membership.user_id='20000000-0000-4000-8000-000000000005'
      AND member_type.is_default
  ) THEN
    RAISE EXCEPTION 'new membership must receive its workspace default';
  END IF;
END $$;

-- Editors can add and rename types, including the default label. The stable
-- default identity and marker remain unchanged.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
INSERT INTO public.workspace_member_types (workspace_id, name)
VALUES ('10000000-0000-4000-8000-000000000001', 'Workers');
UPDATE public.workspace_member_types SET name='People'
WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND is_default;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND name='People' AND is_default) THEN
    RAISE EXCEPTION 'renaming the default must preserve its identity';
  END IF;
END $$;
COMMIT;

-- Service-role-only scheduled-message actions still authorize the named
-- workspace actor, because the API uses its service credential for RPCs.
\ir assert-rejected.sql

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
INSERT INTO public.workspace_member_types(workspace_id,name)
VALUES('10000000-0000-4000-8000-000000000001','Volunteers');
COMMIT;

BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  v_workspace uuid := '10000000-0000-4000-8000-000000000001';
  v_other_workspace uuid := '10000000-0000-4000-8000-000000000002';
  v_admin uuid := '20000000-0000-4000-8000-000000000001';
  v_editor uuid := '20000000-0000-4000-8000-000000000002';
  v_viewer uuid := '20000000-0000-4000-8000-000000000003';
  v_unlinked uuid := '20000000-0000-4000-8000-000000000004';
  v_default_type uuid;
  v_workers_type uuid;
  v_volunteers_type uuid;
  v_audience jsonb;
  v_template uuid;
  v_other_template uuid;
  v_override_schedule uuid;
  v_updated_template uuid;
  v_schedule uuid;
  v_manual_template uuid;
  v_manual_schedule uuid;
  v_recurring_template uuid;
  v_recurring_schedule uuid;
  v_boundary_schedule uuid;
  v_occurrence uuid;
  v_auto_occurrence uuid;
  v_auto_delivery uuid;
  v_manual_delivery uuid;
  v_recurring_delivery uuid;
  v_expiring_occurrence uuid;
  v_unknown_delivery uuid;
  v_revision integer;
  v_today date := (clock_timestamp() AT TIME ZONE 'Africa/Johannesburg')::date;
  v_payload jsonb;
BEGIN
  SELECT id INTO STRICT v_default_type FROM public.workspace_member_types
  WHERE workspace_id=v_workspace AND is_default;
  SELECT id INTO STRICT v_workers_type FROM public.workspace_member_types
  WHERE workspace_id=v_workspace AND name='Workers';
  SELECT id INTO STRICT v_volunteers_type FROM public.workspace_member_types
    WHERE workspace_id=v_workspace AND name='Volunteers';
  UPDATE public.workspace_users SET member_type_id=v_workers_type WHERE workspace_id=v_workspace AND user_id=v_unlinked;
  UPDATE public.workspace_users SET member_type_id=v_volunteers_type WHERE workspace_id=v_workspace AND user_id='20000000-0000-4000-8000-000000000006';
  v_audience := jsonb_build_array(v_default_type, v_workers_type);

  IF has_function_privilege('authenticated', 'public.prepare_scheduled_messages()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.prepare_scheduled_messages()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.create_scheduled_schedule(uuid,uuid,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.create_scheduled_schedule(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'scheduled message RPC grants must be service-role-only';
  END IF;
  IF has_table_privilege('authenticated', 'public.scheduled_message_responses', 'SELECT')
     OR has_table_privilege('authenticated', 'public.scheduled_message_schedules', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated users must not directly read attendance or write schedules';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.workspace_member_types', 'SELECT') THEN
    RAISE EXCEPTION 'service role must be able to read workspace member types';
  END IF;

  -- A Viewer cannot use the privileged API RPC by naming themselves as actor.
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)', v_viewer, v_workspace,
      '{"name":"Denied","messageType":"announcement","body":"Hello","fields":{"title":"Hello"}}'),
    'Not authorised'
  );
  -- An Editor who is only a Viewer in the second workspace cannot create there.
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)', v_editor, v_other_workspace,
      '{"name":"Wrong workspace","messageType":"announcement","body":"Hello","fields":{"title":"Hello"}}'),
    'Not authorised'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)', v_editor, v_workspace,
      jsonb_build_object('name','Wrong audience','messageType','pre_attendance','body','Hello','fields',jsonb_build_object('title','Hello'),'audience',jsonb_build_array('30000000-0000-4000-8000-000000000001'))::text),
    'Invalid member type'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)', v_editor, v_workspace,
      '{"name":"Generated fields","messageType":"pre_attendance","body":"Hello","fields":{"title":"Hello","attendanceRows":"forbidden"},"audience":[]}'),
    'Field is not editable'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)', v_editor, v_workspace,
      '{"name":"Arrival on announcement","messageType":"announcement","body":"Hello","fields":{"title":"Hello","expectedArrival":"09:00"}}'),
    'Field is not editable'
  );

  -- This one-off is eligible for the daily worker today. Its event fields can
  -- be edited before sending while the saved template remains unchanged.
  v_template := public.save_scheduled_template(v_editor, v_workspace,
    jsonb_build_object('name','One-off attendance','messageType','pre_attendance','body','{{title}}','fields',
      jsonb_build_object('title','Morning service','instructions','Meet at the entrance'),
      'audience',v_audience,'requireArrival',true));
  v_schedule := public.create_scheduled_schedule(v_editor, v_workspace,
    jsonb_build_object('templateId',v_template,'groupChatId','-1000000000001','threadId',42,'startsOn',v_today,
      'frequency','once','autoSend',true,'expiryHours',72));
  SELECT id INTO STRICT v_occurrence FROM public.scheduled_message_occurrences WHERE schedule_id=v_schedule;
  v_auto_occurrence := v_occurrence;

  -- Editing a saved template keeps its identity and changes only future
  -- compositions. Existing schedule/occurrence content is an immutable snapshot.
  INSERT INTO public.scheduled_message_templates(workspace_id,name,message_type,body,fields)
  VALUES(v_other_workspace,'Foreign template','announcement','Hi','{"title":"Hi"}')
  RETURNING id INTO v_other_template;
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',v_viewer,v_workspace,
      jsonb_build_object('id',v_template,'name','Viewer edit','messageType','pre_attendance','body','No','fields',jsonb_build_object('title','No','instructions','No'),'audience',v_audience,'requireArrival',true)::text),
    'Not authorised'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',v_editor,v_workspace,
      jsonb_build_object('id',v_other_template,'name','Cross workspace edit','messageType','announcement','body','No','fields',jsonb_build_object('title','No'))::text),
    'Template unavailable in this workspace'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.save_scheduled_template(%L,%L,%L::jsonb)',v_editor,v_workspace,
      jsonb_build_object('id',v_template,'name','Readonly edit','messageType','pre_attendance','body','No','fields',jsonb_build_object('title','No','instructions','No','attendanceRows','forbidden'),'audience',v_audience,'requireArrival',true)::text),
    'Field is not editable'
  );
  v_updated_template := public.save_scheduled_template(v_editor,v_workspace,
    jsonb_build_object('id',v_template,'name','Updated attendance','messageType','pre_attendance','body','Updated {{title}}','fields',
      jsonb_build_object('title','Updated morning','instructions','Updated entrance'),
      'audience',v_audience,'requireArrival',true));
  IF v_updated_template<>v_template THEN
    RAISE EXCEPTION 'editing a template must preserve its identity';
  END IF;
  IF (SELECT fields->>'title' FROM public.scheduled_message_schedules WHERE id=v_schedule)<>'Morning service'
     OR (SELECT body FROM public.scheduled_message_schedules WHERE id=v_schedule)<>'{{title}}'
     OR (SELECT fields->>'title' FROM public.scheduled_message_occurrences WHERE id=v_occurrence)<>'Morning service'
     OR (SELECT body FROM public.scheduled_message_occurrences WHERE id=v_occurrence)<>'{{title}}' THEN
    RAISE EXCEPTION 'template edits must not rewrite existing schedule or occurrence snapshots';
  END IF;

  -- A schedule may override selected template variables. Merge and validate
  -- the result while retaining the template defaults for all other schedules.
  v_override_schedule := public.create_scheduled_schedule(v_editor,v_workspace,
    jsonb_build_object('templateId',v_template,'groupChatId','-1000000000001','threadId',42,'startsOn',v_today+2,
      'frequency','once','autoSend',false,'fields',jsonb_build_object('title','Schedule-only title')));
  IF (SELECT fields->>'title' FROM public.scheduled_message_schedules WHERE id=v_override_schedule)<>'Schedule-only title'
     OR (SELECT fields->>'instructions' FROM public.scheduled_message_schedules WHERE id=v_override_schedule)<>'Updated entrance'
     OR (SELECT fields->>'title' FROM public.scheduled_message_templates WHERE id=v_template)<>'Updated morning' THEN
    RAISE EXCEPTION 'schedule field overrides must be merged independently of template defaults';
  END IF;
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',v_editor,v_workspace,
      jsonb_build_object('templateId',v_template,'groupChatId','-1000000000001','threadId',42,'startsOn',v_today+3,
        'frequency','once','fields',jsonb_build_object('attendanceRows','forbidden'))::text),
    'Field is not editable'
  );

  PERFORM public.change_scheduled_occurrence(v_editor,v_occurrence,1,'instructions','Use the side entrance');
  IF (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE id=v_occurrence)<>'Use the side entrance'
     OR (SELECT fields->>'instructions' FROM public.scheduled_message_templates WHERE id=v_template)<>'Updated entrance' THEN
    RAISE EXCEPTION 'pre-send occurrence edit must be local to the occurrence';
  END IF;
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.change_scheduled_occurrence(%L,%L,1,''title'',''Stale edit'')',v_editor,v_occurrence),
    'Message changed'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.change_scheduled_occurrence(%L,%L,2,''attendanceRows'',''No'')',v_editor,v_occurrence),
    'Field is not editable'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.change_scheduled_occurrence(%L,%L,2,''title'',''Wrong scope'',''series'')',v_editor,v_occurrence),
    'Invalid edit scope'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.change_scheduled_occurrence(%L,%L,2,''expiresAt'',%L)',v_editor,v_occurrence,
      ((v_today::timestamp AT TIME ZONE 'Africa/Johannesburg')::text)),
    'Expiry must be after the send time'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',v_editor,v_workspace,
      jsonb_build_object('templateId',v_other_template,'groupChatId','-1000000000001','startsOn',v_today,'frequency','once')::text),
    'Template unavailable in this workspace'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.create_scheduled_schedule(%L,%L,%L::jsonb)',v_editor,v_workspace,
      jsonb_build_object('templateId',v_template,'groupChatId','-1000000000002','startsOn',v_today,'frequency','once')::text),
    'Telegram group unavailable'
  );

  -- The daily worker queues due automatic sends exactly once. An auto_send=false
  -- schedule waits for an explicit manual-send request.
  v_manual_template := public.save_scheduled_template(v_admin,v_workspace,
    '{"name":"Manual announcement","messageType":"announcement","body":"{{title}}","fields":{"title":"Manual note"} }'::jsonb);
  v_manual_schedule := public.create_scheduled_schedule(v_admin,v_workspace,
    jsonb_build_object('templateId',v_manual_template,'groupChatId','-1000000000001','threadId',42,'startsOn',v_today,
      'frequency','once','autoSend',false,'expiryHours',72));
  PERFORM public.prepare_scheduled_messages();
  SELECT id INTO STRICT v_auto_delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_occurrence AND scheduled_operation='send';
  IF (SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_occurrence AND scheduled_operation='send')<>1 THEN
    RAISE EXCEPTION 'daily preparation must queue a one-off send once';
  END IF;
  IF EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id IN
    (SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_manual_schedule) AND scheduled_operation='send') THEN
    RAISE EXCEPTION 'daily preparation queued a manual-only schedule';
  END IF;
  PERFORM public.request_scheduled_send(v_editor,(SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_manual_schedule));
  SELECT id INTO STRICT v_manual_delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id IN
    (SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_manual_schedule) AND scheduled_operation='send';
  IF (SELECT payload->>'manual' FROM public.notification_deliveries WHERE id=v_manual_delivery)<>'true' THEN
    RAISE EXCEPTION 'manual send must mark the queued delivery as an explicit request';
  END IF;
  PERFORM public.prepare_scheduled_messages();
  IF (SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_occurrence AND scheduled_operation='send')<>1 THEN
    RAISE EXCEPTION 'repeated daily preparation duplicated an already queued automatic send';
  END IF;

  -- A queued automatic delivery is rechecked against the latest schedule date
  -- immediately before the provider call. Moving it to tomorrow defers it.
  PERFORM public.change_scheduled_occurrence(v_editor,v_occurrence,2,'sendOn',(v_today+1)::text);
  UPDATE public.notification_deliveries SET status='processing' WHERE id=v_auto_delivery;
  v_payload := public.begin_scheduled_delivery(v_auto_delivery);
  IF v_payload IS NOT NULL OR (SELECT status FROM public.notification_deliveries WHERE id=v_auto_delivery)<>'pending'
     OR (SELECT next_attempt_at<=clock_timestamp() FROM public.notification_deliveries WHERE id=v_auto_delivery) THEN
    RAISE EXCEPTION 'automatic delivery ignored a future send-date edit';
  END IF;
  PERFORM public.change_scheduled_occurrence(v_editor,v_occurrence,3,'sendOn',v_today::text);

  -- Claim, freeze the roster, and finish the delivery. The roster includes the
  -- linked eligible members, and later changes cannot add new people to it.
  UPDATE public.notification_deliveries SET status='processing' WHERE id=v_auto_delivery;
  v_payload := public.begin_scheduled_delivery(v_auto_delivery);
  IF (v_payload->>'busy')::boolean IS TRUE OR (v_payload->>'expired')::boolean IS TRUE
     OR jsonb_array_length(v_payload->'responses')<>3 THEN
    RAISE EXCEPTION 'begin send must return a frozen three-member Telegram-linked roster';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'responses') r WHERE r->>'user_id'=v_unlinked::text) THEN
    RAISE EXCEPTION 'unlinked member entered the attendance roster';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'responses') r WHERE r->>'user_id'='20000000-0000-4000-8000-000000000006') THEN
    RAISE EXCEPTION 'member outside the selected audience types entered the roster';
  END IF;
  INSERT INTO auth.users(id,email) VALUES('20000000-0000-4000-8000-000000000007','late@example.test');
  INSERT INTO public.users(id,name,surname,email) VALUES('20000000-0000-4000-8000-000000000007','Late','Member','late@example.test');
  INSERT INTO public.workspace_users(workspace_id,user_id,role_id)
  VALUES(v_workspace,'20000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000003');
  IF (public.begin_scheduled_delivery(v_auto_delivery)->>'busy')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'duplicate delivery claim must observe the live lease';
  END IF;
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_occurrence;
  PERFORM public.finish_scheduled_delivery(v_auto_delivery,v_revision,88001);
  IF (SELECT state FROM public.scheduled_message_occurrences WHERE id=v_occurrence)<>'sent'
     OR (SELECT telegram_message_id FROM public.scheduled_message_occurrences WHERE id=v_occurrence)<>88001
     OR (SELECT roster_frozen FROM public.scheduled_message_occurrences WHERE id=v_occurrence) IS NOT TRUE THEN
    RAISE EXCEPTION 'successful send must store sent state, Telegram identity, and frozen roster';
  END IF;
  IF EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=v_occurrence AND user_id='20000000-0000-4000-8000-000000000007')
     OR (SELECT count(*) FROM public.scheduled_message_responses WHERE occurrence_id=v_occurrence)<>3 THEN
    RAISE EXCEPTION 'membership changes after roster freeze altered the sent audience';
  END IF;

  -- An eligible Viewer can respond as a participant. Subsequent event edits
  -- queue edits to the same message and preserve the attendance row/time.
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_occurrence;
  PERFORM public.respond_scheduled_attendance(v_viewer,v_occurrence,v_revision,'attending','09:15');
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_occurrence;
  PERFORM public.change_scheduled_occurrence(v_editor,v_occurrence,v_revision,'instructions','Service begins outside');
  IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=v_occurrence AND user_id=v_viewer
      AND status='attending' AND arrival_time='09:15') THEN
    RAISE EXCEPTION 'sent event edit erased an attendee response or arrival time';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_occurrence AND scheduled_operation='edit') THEN
    RAISE EXCEPTION 'sent event edit did not enqueue a Telegram edit';
  END IF;
  UPDATE public.workspace_users SET member_type_id=v_volunteers_type
    WHERE workspace_id=v_workspace AND user_id=v_viewer;
  IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=v_occurrence AND user_id=v_viewer
      AND status='attending' AND arrival_time='09:15') THEN
    RAISE EXCEPTION 'member-type change erased an already-sent attendance response';
  END IF;
  UPDATE public.workspace_users SET member_type_id=v_default_type
    WHERE workspace_id=v_workspace AND user_id=v_viewer;

  -- A recurring series supports occurrence, future, and entire-series scopes.
  v_recurring_template := public.save_scheduled_template(v_editor,v_workspace,
    jsonb_build_object('name','Recurring attendance','messageType','pre_attendance','body','{{title}}',
      'fields',jsonb_build_object('title','Weekly gathering','instructions','Initial instruction'),
      'audience',v_audience,'requireArrival',true));
  v_recurring_schedule := public.create_scheduled_schedule(v_editor,v_workspace,
    jsonb_build_object('templateId',v_recurring_template,'groupChatId','-1000000000001','threadId',42,
      'startsOn',v_today+4,'untilOn',v_today+6,'frequency','daily','autoSend',false,'expiryHours',72));
  SELECT id INTO STRICT v_expiring_occurrence FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+4;
  SELECT id INTO STRICT v_unknown_delivery FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5;
  PERFORM public.change_scheduled_occurrence(v_editor,v_expiring_occurrence,1,'title','Only this day');
  IF (SELECT fields->>'title' FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence)<>'Only this day'
     OR (SELECT fields->>'title' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5)<>'Weekly gathering' THEN
    RAISE EXCEPTION 'occurrence scope changed another date in the series';
  END IF;
  PERFORM public.change_scheduled_occurrence(v_editor,v_unknown_delivery,1,'instructions','This and future','future');
  IF (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+4)<>'Initial instruction'
     OR (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5)<>'This and future'
     OR (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+6)<>'This and future' THEN
    RAISE EXCEPTION 'future scope must preserve earlier occurrence content';
  END IF;
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5;
  PERFORM public.change_scheduled_occurrence(v_editor,v_unknown_delivery,v_revision,'instructions','This and later','future');
  IF (SELECT count(*) FROM public.scheduled_message_series_changes WHERE schedule_id=v_recurring_schedule
      AND field='instructions' AND effective_on>=v_today+5)<>1
     OR (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+6)<>'This and later' THEN
    RAISE EXCEPTION 'later future edit did not supersede the previous same-field patch';
  END IF;
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5;
  PERFORM public.change_scheduled_occurrence(v_editor,v_unknown_delivery,v_revision,'instructions','Another future instruction','future');

  -- Manually send an upcoming occurrence; whole-series edits update its sent
  -- content and queue an edit while retaining the original Telegram ID.
  PERFORM public.request_scheduled_send(v_editor,v_expiring_occurrence);
  SELECT id INTO STRICT v_recurring_delivery FROM public.notification_deliveries
    WHERE scheduled_occurrence_id=v_expiring_occurrence AND scheduled_operation='send';
  UPDATE public.notification_deliveries SET status='processing' WHERE id=v_recurring_delivery;
  PERFORM public.begin_scheduled_delivery(v_recurring_delivery);
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence;
  PERFORM public.finish_scheduled_delivery(v_recurring_delivery,v_revision,88002);
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence;
  PERFORM public.change_scheduled_occurrence(v_editor,v_expiring_occurrence,v_revision,'title','Entire series','series');
  IF (SELECT count(*) FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND fields->>'title'='Entire series')<>3
     OR (SELECT telegram_message_id FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence)<>88002
     OR NOT EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_expiring_occurrence AND scheduled_operation='edit') THEN
    RAISE EXCEPTION 'series scope must update sent and future content without replacing the Telegram message';
  END IF;
  IF (SELECT fields->>'instructions' FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+6)<>'Another future instruction' THEN
    RAISE EXCEPTION 'series edit lost an unrelated future-field patch';
  END IF;
  UPDATE public.scheduled_message_occurrences SET expires_at=clock_timestamp()-interval '1 second'
    WHERE id=v_expiring_occurrence;
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5;
  PERFORM public.change_scheduled_occurrence(v_editor,
    (SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_recurring_schedule AND occurrence_on=v_today+5),
    v_revision,'instructions','New active series text','series');
  IF (SELECT fields->>'title' FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence)<>'Entire series'
     OR (SELECT expires_at>clock_timestamp() FROM public.scheduled_message_occurrences WHERE id=v_expiring_occurrence) THEN
    RAISE EXCEPTION 'series edits resurrected or rewrote expired history';
  END IF;

  -- A future-scope change at the edge of the materialized horizon is recorded
  -- by effective date, so the worker can apply it to later unseen occurrences.
  v_boundary_schedule := public.create_scheduled_schedule(v_editor,v_workspace,
    jsonb_build_object('templateId',v_recurring_template,'groupChatId','-1000000000001','threadId',42,
      'startsOn',v_today+30,'untilOn',v_today+40,'frequency','daily','autoSend',false,'expiryHours',72));
  SELECT id INTO STRICT v_occurrence FROM public.scheduled_message_occurrences
    WHERE schedule_id=v_boundary_schedule AND occurrence_on=v_today+32;
  IF EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE schedule_id=v_boundary_schedule AND occurrence_on=v_today+33) THEN
    RAISE EXCEPTION 'materializer exceeded its bounded future window';
  END IF;
  PERFORM public.change_scheduled_occurrence(v_editor,v_occurrence,1,'instructions','After day 32','future');
  IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_series_changes WHERE schedule_id=v_boundary_schedule
      AND effective_on=v_today+32 AND field='instructions' AND value='After day 32') THEN
    RAISE EXCEPTION 'future-scope edit was not retained for later, unmaterialized occurrences';
  END IF;

  -- Expiry closes participant callbacks and management immediately while
  -- retaining the historical message identity and response data.
  UPDATE public.scheduled_message_occurrences SET expires_at=clock_timestamp()-interval '1 second'
  WHERE id=v_auto_occurrence;
  SELECT revision INTO v_revision FROM public.scheduled_message_occurrences WHERE id=v_auto_occurrence;
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.respond_scheduled_attendance(%L,%L,%s,''not_attending'')',v_viewer,v_auto_occurrence,v_revision),
    'Attendance is closed'
  );
  PERFORM pg_temp.assert_rejected(
    format('SELECT public.change_scheduled_occurrence(%L,%L,%s,''title'',''Too late'')',v_editor,v_auto_occurrence,v_revision),
    'Message is no longer editable'
  );
  PERFORM public.prepare_scheduled_messages();
  IF NOT EXISTS(SELECT 1 FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_auto_occurrence AND scheduled_operation='expire') THEN
    RAISE EXCEPTION 'expiry did not queue keyboard cleanup';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.scheduled_message_responses WHERE occurrence_id=v_auto_occurrence AND user_id=v_viewer AND arrival_time='09:15') THEN
    RAISE EXCEPTION 'expiry did not preserve attendance history';
  END IF;

  -- An expired queued send is rejected before the Telegram side effect.
  UPDATE public.scheduled_message_occurrences SET expires_at=clock_timestamp()-interval '1 second'
    WHERE schedule_id=v_manual_schedule;
  SELECT id INTO STRICT v_manual_delivery FROM public.notification_deliveries
    WHERE scheduled_occurrence_id=(SELECT id FROM public.scheduled_message_occurrences WHERE schedule_id=v_manual_schedule) AND scheduled_operation='send';
  UPDATE public.notification_deliveries SET status='processing' WHERE id=v_manual_delivery;
  v_payload := public.begin_scheduled_delivery(v_manual_delivery);
  IF v_payload IS NOT NULL OR (SELECT status FROM public.notification_deliveries WHERE id=v_manual_delivery)<>'failed' THEN
    RAISE EXCEPTION 'expired send entered the provider delivery path';
  END IF;

  -- A crashed send with an ambiguous outcome becomes unknown and is never
  -- automatically requeued by the daily worker.
  v_manual_schedule := public.create_scheduled_schedule(v_editor,v_workspace,
    jsonb_build_object('templateId',v_manual_template,'groupChatId','-1000000000001','threadId',42,'startsOn',v_today,
      'frequency','once','autoSend',true,'expiryHours',72));
  SELECT id INTO STRICT v_unknown_delivery FROM public.scheduled_message_occurrences WHERE schedule_id=v_manual_schedule;
  PERFORM public.prepare_scheduled_messages();
  SELECT id INTO STRICT v_unknown_delivery FROM public.notification_deliveries WHERE scheduled_occurrence_id=v_unknown_delivery AND scheduled_operation='send';
  UPDATE public.notification_deliveries SET status='processing' WHERE id=v_unknown_delivery;
  PERFORM public.begin_scheduled_delivery(v_unknown_delivery);
  UPDATE public.scheduled_message_occurrences SET lease_until=clock_timestamp()-interval '1 second'
    WHERE id=(SELECT scheduled_occurrence_id FROM public.notification_deliveries WHERE id=v_unknown_delivery);
  PERFORM public.recover_scheduled_deliveries();
  IF (SELECT state FROM public.scheduled_message_occurrences WHERE id=(SELECT scheduled_occurrence_id FROM public.notification_deliveries WHERE id=v_unknown_delivery))<>'unknown'
     OR (SELECT status FROM public.notification_deliveries WHERE id=v_unknown_delivery)<>'failed' THEN
    RAISE EXCEPTION 'ambiguous send recovery must prevent automatic retry';
  END IF;
  PERFORM public.prepare_scheduled_messages();
  IF (SELECT count(*) FROM public.notification_deliveries WHERE scheduled_occurrence_id=(SELECT scheduled_occurrence_id FROM public.notification_deliveries WHERE id=v_unknown_delivery) AND scheduled_operation='send')<>1 THEN
    RAISE EXCEPTION 'daily worker requeued an ambiguous send';
  END IF;
END $$;
COMMIT;

-- Temporarily turn the boundary schedule into a one-off beyond the normal
-- +32-day window. This exercises the actual materializer's stored-patch
-- resolution for a date that had no occurrence row, then rolls everything
-- back so the subsequent concurrency check can use the recurring schedule.
BEGIN;
UPDATE public.scheduled_message_schedules
SET frequency='once', starts_on=(clock_timestamp() AT TIME ZONE timezone)::date+40, until_on=NULL
WHERE template_id=(SELECT id FROM public.scheduled_message_templates WHERE name='Recurring attendance')
  AND starts_on=(clock_timestamp() AT TIME ZONE timezone)::date+30;
SELECT public.materialize_scheduled_messages(id)
FROM public.scheduled_message_schedules
WHERE template_id=(SELECT id FROM public.scheduled_message_templates WHERE name='Recurring attendance')
  AND frequency='once'
  AND starts_on=(clock_timestamp() AT TIME ZONE timezone)::date+40;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.scheduled_message_occurrences AS occurrence
    JOIN public.scheduled_message_schedules AS schedule ON schedule.id=occurrence.schedule_id
    WHERE schedule.template_id=(SELECT id FROM public.scheduled_message_templates WHERE name='Recurring attendance')
      AND occurrence.occurrence_on=(clock_timestamp() AT TIME ZONE schedule.timezone)::date+40
      AND occurrence.fields->>'instructions'='After day 32'
      AND occurrence.fields->>'title'='Weekly gathering'
  ) THEN
    RAISE EXCEPTION 'materializer did not apply the future patch to a previously unmaterialized date beyond day 32';
  END IF;
END $$;
ROLLBACK;

-- Scheduled data is visible to Admins and Editors of its workspace, while a
-- Viewer and an Editor from a different workspace cannot enumerate it.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.scheduled_message_templates)<>0
     OR (SELECT count(*) FROM public.scheduled_message_schedules)<>0
     OR (SELECT count(*) FROM public.scheduled_message_occurrences)<>0 THEN
    RAISE EXCEPTION 'Viewer can read scheduled-message administrative data';
  END IF;
END $$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.scheduled_message_templates WHERE workspace_id<>'10000000-0000-4000-8000-000000000001')
     OR EXISTS(SELECT 1 FROM public.scheduled_message_schedules WHERE workspace_id<>'10000000-0000-4000-8000-000000000001')
     OR EXISTS(SELECT 1 FROM public.scheduled_message_occurrences WHERE workspace_id<>'10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Editor can read scheduled-message data from another workspace';
  END IF;
END $$;
COMMIT;

-- Viewers may read their workspace types but cannot create a type.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
DO $$
DECLARE
  visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM public.workspace_member_types;
  IF visible_count <> 3 THEN
    RAISE EXCEPTION 'workspace member must only see types in their workspace; found %', visible_count;
  END IF;
  BEGIN
    INSERT INTO public.workspace_member_types (workspace_id, name)
    VALUES ('10000000-0000-4000-8000-000000000001', 'Should Be Rejected');
    RAISE EXCEPTION 'viewer unexpectedly created a member type';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
COMMIT;

-- Workspace admin RPCs accept an Editor and reject a Viewer.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT public.set_workspace_member_type(
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000004',
  (SELECT id FROM public.workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND name='Workers')
);
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.set_workspace_member_type(
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000004',
      (SELECT id FROM public.workspace_member_types WHERE workspace_id='10000000-0000-4000-8000-000000000001' AND name='Workers')
    );
    RAISE EXCEPTION 'viewer unexpectedly reassigned a member type';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
COMMIT;
