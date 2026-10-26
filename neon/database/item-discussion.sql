-- Apply with psql --single-transaction after the legacy import/parity check.
-- The ordered files form one migration; failure rolls back the complete change.
\ir request-links.sql
\ir item-discussion-schema.sql
\ir item-discussion-recording.sql
\ir item-discussion-triggers.sql
\ir item-discussion-children.sql
\ir item-discussion-legacy.sql
\ir item-discussion-notes.sql
\ir item-discussion-public-requests.sql
\ir item-discussion-public-bookings.sql
