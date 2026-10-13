# Organize navigation around work and connect related records

The flat sidebar exposed individual domains but made users switch sections to
coordinate one piece of work. Settings also contained member approvals and venue
catalogues alongside workspace configuration.

## Decision

- A permanent primary icon rail selects Work, Production, or People & resources.
  The secondary rail shows that group's destinations; collapsing hides only the
  secondary rail. The workspace logo reveals that control on hover or keyboard
  focus. Mobile shows both rails inside the existing navigation drawer.
- The primary rail's footer contains the account avatar and its existing profile,
  settings, workspace-switching, and logout menu.
- Requests remains the authenticated landing route. No dashboard returns.
- Members moves to `/members`, retaining the existing editor/role-manager access
  condition. Approvals and role changes remain restricted to role managers.
- Venue catalogue and event types live alongside venue bookings. Request
  categories live in Requests. Management retains its existing permissions.
- Member types, request types, venues, and venue event types are created and
  renamed in their searchable option controls. Separate management tabs and
  pages are removed; option management needs only a name.
- Request work views and type filters live inside the existing filter drawer.
  Collection toolbars keep search and the Filter button. Option controls expose
  activation only where the domain supports it; inactive venues stop accepting
  bookings while existing records remain available. Long option names truncate,
  and management menus support pointer and keyboard access.
- Workspace settings contains General, Integrations, Notifications, and
  Automation. Legacy settings bookmarks redirect to their current destinations.
- Equipment bookings, venue bookings, streams, and Zoom meetings may link to a
  request explicitly. The link is optional, must stay within one workspace, and
  detaches when the request is deleted. Operational lifecycle rules remain owned
  by each domain. Existing checklist links are reused.
- Requests can create linked checklist runs and connected streams/meetings using
  the existing creation forms. Equipment and venue bookings continue to enter
  through their existing submission flows.
- Schedule shows occurrence dates with distinct equipment booking and planned
  return entries alongside requests, venues, streams, meetings, and checklist
  runs. Scheduled messages use the date/time displayed in their message, which
  currently derives from expiry; send dates are excluded. A dropdown type filter
  selects the visible records, with colors identifying each type and no date
  presets or separate color legend. Workspace-wide search is removed.
  View/filter state is carried in URLs and detail links preserve their origin.

## Deployment

Apply [`request-links.sql`](../../neon/database/request-links.sql) with the migration
owner before deploying the API that reads these columns. Apply it after a fresh
bootstrap/import as well; the legacy import column contracts are unchanged.

## Consequences

Cross-feature coordination becomes possible without requiring every record to
belong to a request. Venue event types remain booking categories, not a new
production/event domain. This decision supersedes the flat sidebar arrangement
in ADR-0007 while preserving ADR-0011's Requests landing route.
