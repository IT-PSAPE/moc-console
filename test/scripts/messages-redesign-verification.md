# Messages redesign verification

Use `bash test/scripts/scheduled-v2.integration.sh` for a socket-only disposable PostgreSQL migration and lifecycle rehearsal. It must not read application env files or contact Telegram. The historical import baseline remains covered by the legacy SQL fixtures.

Build the isolated production UI fixture with `node test/scripts/build-messages-redesign-fixture.ts`. Supply `/fixture-api` responses using `messages-redesign.dependencies.ts`; never point this fixture at a real Telegram destination. The fixture runs the actual Console screens, shared rich editor, query cache, and preview renderer.

Exercise through the supported browser UI tool:

1. New message opens directly; templates, title/instructions, Source, expiry, auto-send, arrival toggle and editable timezone controls are absent.
2. Type `/date` or `/time` in the rich editor. The menu must keep focus in the editor; arrows select, Enter replaces the entire command with a chip, Escape dismisses. Click or keyboard-focus a chip to edit it in its picker. No trailing command text or caret loss.
3. Keep Editor/Preview in the editor header. Formatting, tables, links and selected date/time values survive view and message-type changes.
4. Configure destination and send now or schedule. Schedule fields form one column. Attendance requires attendees and a follow-up delay; daily/weekly/monthly expose an optional final date. Review payload uses workspace timezone and contains no retired keys.
5. Submit only to the recording fixture boundary. Check payload and UI result; no provider should receive a message.
6. Upcoming and History list rows show one status badge and an overflow menu. Open Activity, edit body/groups/follow-up delay, and verify stored occurrence identity stays unchanged. History paginates and refreshes without losing older rows.
7. At a 375px viewport, exercise the composer, menu, picker, preview and confirmation. Verify reachable controls and no horizontal overflow. Restore the viewport afterward.

The obsolete browser scripts for template/title/expiry interactions were removed because those controls no longer exist. Current API, renderer, payload, migration and lifecycle suites replace their deterministic coverage; real UI inspection establishes the editor and layout behavior.
