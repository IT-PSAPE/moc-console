# Remove Dashboard and use a section landing route

The Dashboard duplicated a small subset of Requests and Equipment bookings. User testing showed that people skipped it and navigated directly to the operational sections, so maintaining a separate summary screen added code and an extra navigation decision without helping the workflow.

## Considered options

- **Keep the Dashboard and improve its summaries.** Rejected: the problem was lack of use, not missing summary cards.
- **Replace it with another cross-section overview.** Rejected: the sidebar already exposes each flat destination directly, and another overview would preserve the unnecessary intermediate step.
- **Remove the Dashboard and land in an existing section.** Chosen.

## Decision

- The Dashboard route, screen, hook, sidebar item, and route constant are removed.
- Requests is the authenticated landing route because it is the primary incoming work queue and the first operational destination.
- Login, password recovery, workspace switching, and the protected index route send authenticated users to `/requests`.
- The shared breadcrumb resolver points Home to `/requests` rather than the removed overview.
- Equipment bookings is named explicitly in navigation so its scope is clear.

## Consequences

- Requests and equipment-booking summaries are available only in their full section views.
- `/dashboard` is no longer a supported route and follows the normal unknown-route behavior.
- ADR-0007 and ADR-0009 remain historical records; this decision supersedes only their references to Dashboard as a live destination.
