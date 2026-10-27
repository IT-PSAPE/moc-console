BEGIN;
SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id', '20000000-0000-4000-8000-000000000001', true);
INSERT INTO moc_private.console_push_subscriptions (id,user_id,endpoint,p256dh,auth)
VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','https://fcm.googleapis.com/fcm/send/sql-test',repeat('A',87),repeat('A',22));
DO $$
BEGIN
  IF (SELECT count(*) FROM moc_private.console_push_subscriptions) <> 1 THEN
    RAISE EXCEPTION 'Owner cannot read their subscription';
  END IF;
  BEGIN
    INSERT INTO moc_private.console_push_subscriptions (user_id,endpoint,p256dh,auth)
    VALUES ('20000000-0000-4000-8000-000000000002','https://fcm.googleapis.com/fcm/send/foreign',repeat('A',87),repeat('A',22));
    RAISE EXCEPTION 'Owner can forge another user';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM moc_private.console_push_deliveries;
    RAISE EXCEPTION 'App can read worker queue';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('moc.user_id', '20000000-0000-4000-8000-000000000002', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM moc_private.console_push_subscriptions) THEN
    RAISE EXCEPTION 'Another account can read push credentials';
  END IF;
  DELETE FROM moc_private.console_push_subscriptions WHERE id='30000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'Another account can remove a subscription'; END IF;
END;
$$;

SET LOCAL ROLE moc_worker;
INSERT INTO moc_private.console_push_deliveries (subscription_id,event_key,payload)
VALUES ('30000000-0000-4000-8000-000000000001','sql:push:1','{"title":"Test"}');
INSERT INTO moc_private.console_push_deliveries (subscription_id,event_key,payload)
VALUES ('30000000-0000-4000-8000-000000000001','sql:push:1','{"title":"Duplicate"}')
ON CONFLICT (event_key,subscription_id) DO NOTHING;
DO $$
BEGIN
  IF (SELECT count(*) FROM moc_private.console_push_deliveries) <> 1 THEN
    RAISE EXCEPTION 'Push delivery dedupe failed';
  END IF;
END;
$$;

SET LOCAL ROLE moc_app;
SELECT set_config('moc.user_id', '20000000-0000-4000-8000-000000000001', true);
DELETE FROM moc_private.console_push_subscriptions WHERE id='30000000-0000-4000-8000-000000000001';
SET LOCAL ROLE moc_worker;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM moc_private.console_push_deliveries) THEN
    RAISE EXCEPTION 'Unsubscribing retained pending push deliveries';
  END IF;
END;
$$;

SET LOCAL ROLE moc_public;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM moc_private.console_push_subscriptions;
    RAISE EXCEPTION 'Public role can read push credentials';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;
