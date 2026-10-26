DO $$ BEGIN
 IF to_regclass('public.item_activity') IS NULL OR to_regclass('public.item_comments') IS NULL THEN
  RAISE EXCEPTION 'Shared item discussion tables are missing';
 END IF;
 IF to_regclass('public.request_activity') IS NOT NULL OR to_regclass('public.request_comments') IS NOT NULL
  OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND ((table_name='requests' AND column_name IN ('notes','content')) OR (table_name IN ('equipment','bookings','venue_bookings') AND column_name='notes'))) THEN
  RAISE EXCEPTION 'Obsolete request discussion storage remains';
 END IF;
 IF has_table_privilege('moc_app','public.item_activity','INSERT,UPDATE,DELETE')
  OR has_table_privilege('moc_worker','public.item_activity','INSERT,UPDATE,DELETE')
  OR has_table_privilege('moc_app','moc_private.request_discussion_backup','SELECT')
  OR has_table_privilege('moc_worker','moc_private.request_discussion_backup','SELECT')
  OR has_table_privilege('moc_app','moc_private.item_notes_backup','SELECT')
  OR has_table_privilege('moc_worker','moc_private.item_notes_backup','SELECT') THEN
  RAISE EXCEPTION 'Item discussion runtime grants are unsafe';
 END IF;
END $$;
