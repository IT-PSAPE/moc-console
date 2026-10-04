-- Backend runtime privileges are deliberately assigned after all domain and
-- operational tables exist.
GRANT USAGE ON SCHEMA public TO moc_app, moc_public, moc_worker;
GRANT USAGE ON SCHEMA moc_private TO moc_app, moc_worker;
GRANT USAGE ON SCHEMA moc_auth TO moc_worker;
GRANT EXECUTE ON FUNCTION moc_private.actor_id() TO moc_app, moc_public, moc_worker;
GRANT EXECUTE ON FUNCTION public.refresh_equipment_status_for(uuid) TO moc_app;

-- The internal auth proxy claims signed-request nonces through queryRows as a
-- worker. Keep the privilege scoped to the replay table; account/session
-- credential tables stay owner-only.
GRANT SELECT, INSERT, DELETE ON moc_auth.internal_request_nonce TO moc_worker;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO moc_worker;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO moc_worker;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO moc_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA moc_private TO moc_worker;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA moc_private TO moc_worker;

GRANT SELECT, INSERT, UPDATE ON moc_private.storage_uploads TO moc_app;
GRANT SELECT, INSERT, UPDATE ON moc_private.storage_upload_chunks TO moc_app;
GRANT SELECT ON moc_private.storage_objects TO moc_app;
GRANT SELECT ON public.broadcast_revision_counters, public.broadcast_revisions TO moc_app;
