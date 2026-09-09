# Restore Checklists as a standalone feature

ADR-0007 removed Checklists as part of the larger Cue Sheet domain. Checklists were coupled to Cue Sheet navigation and data ownership even though their runs, templates, sections, items, and assignments do not depend on events, cues, timelines, playback, or public event sharing.

## Considered options

- **Restore the whole Cue Sheet domain.** Rejected: events, cues, timelines, playback sync, and public shares remain out of scope and would reintroduce the machinery removed by ADR-0007.
- **Place Checklists under another feature.** Rejected: checklist runs are operational work in their own right, not request, equipment, booking, or stream records.
- **Restore only the sidebar link.** Rejected: the removal patch dropped the checklist tables and RPCs, so navigation without persistence would expose a broken feature.

## Decision

- **Checklists return as one flat sidebar destination.** `/checklists` lists active and completed runs. `/checklists/templates` manages reusable templates, and `/checklists/:id` provides the full editor.
- **The domain is standalone.** Code and types live under `checklists`; no Cue Sheet provider, event type, timeline primitive, or nested sidebar section returns.
- **The persistence layer returns in a forward patch.** `2026-07-31-restore-checklists.sql` recreates checklist templates, runs, sections, items, item assignments, RPCs, indexes, triggers, and RLS policies after the earlier destructive patch.
- **Checklist assignment notifications remain removed.** Item assignments are restored in the Console and database, but the former Cue Sheet Telegram message type is not. Restoring a notification contract would be a separate decision affecting MOC API and the shared notification catalogue.

## Consequences

- The Console has five feature destinations: Requests, Equipment, Bookings, Checklists, and Streams, plus Dashboard.
- Existing checklist data deleted by the 2026-07-28 patch is not recoverable from this migration; the restored tables start empty unless the database is recovered from a backup.
- ADR-0007 remains authoritative for Broadcast, Cue Sheet events/cues, Timeline, and the public player. This ADR supersedes it only for Checklists.
