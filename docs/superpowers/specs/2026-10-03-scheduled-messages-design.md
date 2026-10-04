# Scheduled messages and Telegram management — approved design

Status: approved for implementation on 3 October 2026, with the amendments below incorporated. The supplied screenshots are historical context, not instructions to execute. This proposal follows the user's latest explanation: predefined message templates with controlled editable fields, scheduled delivery to linked Telegram groups/topics, and native Telegram interactions. No AI interpreter or additional Mini App is needed.

## Current flow, verified in the repository

| Area | Current behavior | Reuse or change |
| --- | --- | --- |
| Templates | `notification_message_templates` overrides one body per workspace/scope/event type; `packages/notifications/src/render-template.ts` renders tokens. Console already has source editing and preview. | Reuse rendering, HTML conversion, validation patterns, and editor primitives. Named scheduled templates need their own definition identity; existing event overrides are not recurring schedules. |
| Destinations | `telegram_groups`, `telegram_group_topics`, and notification routes bind destinations to workspaces. Dispatch validates active groups and open topics. | Reuse registration and destination validation, including another validation at send time. |
| Notifications | Database events enter `notification_outbox`, then produce `notification_deliveries`; deliveries have claims, retries, destination uniqueness, and Telegram message IDs. | Extend this delivery pipeline with occurrence references and edit operations. Do not create another Telegram sender or independent delivery queue. |
| Sent messages | `notifications/follow-ups.ts` rebuilds announcements from live entity data and edits their original Telegram messages. Failures are best effort; only keyboard state is persisted after a refresh. | Reuse transport/rendering. Scheduled messages require durable revision synchronization and explicit failure reporting rather than best-effort success. |
| Telegram | Webhook secret, rate limits, durable update claims; `/start` account linking; group/topic registration; callback actions for requests and bookings. | Extend routing with separately namespaced administrative and participant flows. Add ephemeral methods, ForceReply, message return links, and durable user-bound sessions. |
| Identity and permissions | Telegram sender IDs resolve through `users.telegram_chat_id`; `workspace_users` joins workspace roles. Existing callback RPC requires `can_update`. Template writes and Telegram settings require `can_manage_roles`. | Admin/Editor message management uses workspace update permission. Do not grant Editors integration or role-management permission. Recheck authorization on every action, reply, and confirmation. |
| Member types | Users have roles, duties, and profile status, but no member-type classification was found. The member settings tab is currently restricted to role managers. | Add a separate workspace member-type classification and limited Editor-accessible classification controls; preserve the existing restrictions on roles and member approval. |
| Timing | `apps/api/vercel.json` invokes the delivery worker daily at `0 1 * * *`; retries are at least 24 hours apart. Venue bookings have recurrence and a clock-derived lifecycle, but no scheduled-message domain exists. | Extend the existing worker with calendar-date eligibility and manual Send now; retain its daily frequency. Do not confuse delivery retries with recurrence. Reuse recurrence concepts after separating venue-specific assumptions. |
| Pre-attendance | No attendance records, participant callbacks, arrival-time sessions, or roster were found. | This flow must be implemented; the screenshots describe a proposed experience, not an existing feature. |

This records the approved product and workflow design. It does not certify the deployed database, bot permissions, or client behavior.

## Product model

1. **Template:** a named saved layout/preset, its message type, and declared fields. Some fields are editable; others are fixed or generated. Editing a template must not silently rewrite existing sent occurrences.
2. **Schedule:** a template version/snapshot plus default field values, one registered group/topic, timezone, send rule, expiry rule, and optional recurrence. First-version recurrence covers once, daily, weekdays, weekly, and monthly using calendar rules rather than asking users to author cron expressions.
3. **Occurrence:** one stable identity with its own resolved content, original recurrence position, send time, expiry time, overrides, revision, delivery reference, and participant responses. Moving a send time must not create a new occurrence identity or lose its Telegram message ID.

The underlying representation should separate queryable lifecycle/ownership data from validated template field values. A message-type registry owns field definitions and rendering. The Telegram menu lists declared editable fields; it never discovers arbitrary database columns or lets an administrator edit generated attendance rows.

The first two types are an ordinary announcement and pre-attendance. A pre-attendance template can expose title and instructions (including any arrival guidance). These are examples of the registry, not columns that every future type must support. Attendance rows and buttons are generated from response records.

## Member types and roster selection

The user clarified that pre-attendance rosters are chosen by member type. Member types are labels such as Members, MOC workers, and MOC volunteers, separate from security roles.

- Recommend one member type per workspace membership, rather than a global user profile field. A person can therefore be a worker in one workspace and a volunteer in another without leaking classifications across workspaces.
- Each workspace always has exactly one default type. Its initial name is Members; Admins and Editors can rename it. Identify it by a stable ID and explicit default marker, never by its name. Render a Default badge even after renaming.
- Existing memberships and newly approved memberships receive the default type. Pending join requests do not appear as attendees.
- Admins and Editors can create named types and assign/change a member's type. Expose only these operations to Editors; they cannot change security roles, approve accounts, or register integrations through the classification controls. No type-deletion flow is needed in the first version.
- A pre-attendance template defines its default audience type selection; the first version copies it into the schedule snapshot. Allow one or more types. Resolve the union of matching workspace members without duplicates.
- Include matching unlinked members in the awaiting-response list. They can respond after linking Telegram; Telegram linkage is an identity mechanism, not a condition for belonging to the roster.
- Resolve and snapshot its roster from current classifications at send time. Later classification or audience-default changes affect future unsent occurrences, not the identities or responses on an already-sent message.
- Removed workspace members retain historical response records but cannot continue interacting. A member-type change alone does not erase an eligible attendee's response on an already-sent occurrence.

The user approved the classification model together with the architecture readback.

## Lifecycle

- A scheduled occurrence exists and is manageable before sending. A one-off has one occurrence; a recurring schedule materializes a bounded future window, extended by the worker and when an authorized user requests upcoming occurrences.
- At send time the worker locks/claims the occurrence, validates its destination and expiry, renders its latest revision, and sends through the existing delivery pipeline. It records the Telegram chat/message ID and thread context.
- A sent occurrence remains active until its separate expiry. Its historical send time is not rescheduled; changing event/arrival time edits the original content. Changes to future delivery times affect unsent occurrences only.
- `now >= expiresAt` makes an occurrence inactive immediately in queries and all mutation paths, independent of worker cadence. An unsent expired occurrence is never delivered, including on retry.
- Expiry excludes the occurrence from Telegram management and rejects participant callbacks, old deep links, pending replies, and pending confirmations. The worker removes its keyboard and can mark it closed. Telegram failure may leave old buttons visible temporarily; server rejection still applies.
- Expiry is not deletion. Preserve the record, message identity, revisions, and attendance history. Expired occurrences are not revived by changing the series.
- Delivery failure and synchronization failure remain visible separately from lifecycle. Cancellation controls are outside the first version.

Expiry initially resolves as configured hours after the local send-date midnight, separately for each occurrence. One-off and recurring occurrences can also receive an explicit expiry timestamp. Send time and expiry remain independent of arrival guidance in instructions and each attendee’s own arrival time. Validate that an occurrence expires after its send time.

## Editing and recurrence scopes

All writes use the same backend validation and optimistic revision checks, regardless of their interaction surface. Telegram administrators edit exposed fields, not the full generated output. The user confirmed that both Console and Telegram expose sent-occurrence edits through this same backend. Sending does not make the occurrence read-only; it changes the mutation from updating future content to editing the stored original message.

| Scope | Proposed meaning |
| --- | --- |
| This occurrence | Change this stable occurrence only. Preserve the series definition. |
| This and future occurrences | Apply the change at the selected original recurrence position, preserving earlier occurrence history; newly generated future occurrences use the new defaults. |
| Entire series | Update the series defaults and all unexpired occurrences, including earlier active sent occurrences. Preserve expired history. |
| One-off | Edit directly; never display recurring scope choices. |

For a first implementation, applying a scoped field change overwrites that field within the chosen scope, including prior overrides of that field; unrelated overrides remain. The confirmation must state this. An individual unsent occurrence can change its send date. Series-wide expiry duration changes are supported. Cadence and destination changes use a new schedule in the first version; sent delivery destinations remain immutable.

An administrator's proposed change is not a write. Show current value, collect a replacement with native input, choose scope if recurring, then show the old/new values and require Apply. Revalidate role, expiry, field schema, and revision at Apply. A stale proposal must be refreshed rather than overwriting concurrent updates.

## Synchronization and duplicate prevention

Save a confirmed revision and an edit job atomically. Serialize edits per occurrence/destination, render from the newest occurrence plus current responses, and update the same stored Telegram message. Record the synchronized revision only after Telegram confirms success. Expose pending/failed synchronization and retry edits; never replace a failed edit with a new message.

Existing delivery uniqueness helps prevent concurrent enqueues, but cannot guarantee exactly-once Telegram sends after an ambiguous network timeout or a crash between Telegram acceptance and storing its message ID. Treat an uncertain scheduled send as requiring reconciliation rather than blindly retrying and potentially duplicating it. This is a real boundary, not a guarantee that can be solved solely with a database unique constraint.

## Administrative Telegram flow

`/manage_messages` → upcoming/sent-active list → occurrence → editable field or lifecycle information → native input → recurring scope if needed → preview → Apply/Cancel.

Use an ephemeral command and one editable private-to-user menu in the relevant linked group/topic where supported. Bind the persisted session to Telegram user, workspace, origin chat/topic, occurrence, expected revision, and a short session timeout. An ephemeral ID is transport metadata, never the message's identity or source of truth.

Scope commands to linked Admin/Editor members; refresh/remove scoped commands when identity, role, membership, or destination changes. Hidden commands do not authorize anything. Verify the workspace and current role for every backend operation, including manually typed commands and forged callback payloads. Never infer MOC authorization from Telegram group administrator status.

Use an ephemeral ForceReply prompt for text input. If the client loses the interaction, the user restarts it; there is no private-chat fallback. Editing an existing menu supports inline markup, so a ForceReply prompt may require a separate short-lived message; do not promise literally zero extra messages. Match replies to the user's pending prompt, not any subsequent text. Replies are accepted only when their ephemeral prompt and sender match the persisted session.

## Participant Telegram flow

The original group pre-attendance message exposes Attending, Not attending, and Update response. Telegram identity identifies the participant; callback/deep-link IDs do not authorize editing another person.

When arrival time is required, open an ephemeral flow in the group, show the current response, and ask for the time using ForceReply. Save the response for that occurrence and participant, then rerender the original group message. Provide Back to pre-attendance using a topic-aware original-message link when the chat supports it. Basic groups lack a supported original-message link, so the first version omits that return button there.

Participant eligibility is separate from Admin/Editor permissions: a Viewer may respond as an eligible attendee while having no administrative access. Changing the title or instructions must retain all responses and personal arrival times. Store the occurrence revision acknowledged by a response so the UI can identify responses made before a material event change; do not reset them or automatically send bulk reminders.

The roster/eligibility source is the user-selected member types described above. Do not open participation to arbitrary group members. The member's linked identity must map to the occurrence's roster and a current workspace membership.

## Operational and Telegram limits

- A Neon scheduled worker runs hourly. Calendar dates determine which automatic messages are eligible when it runs. Send now is available for other times; arbitrary time-of-day delivery is not promised. Bots cannot preload Telegram scheduled messages (`SCHEDULE_BOT_NOT_ALLOWED`): https://core.telegram.org/method/messages.sendMessage . Production schedules remain disabled until cutover explicitly enables them.
- Current Telegram supports ephemeral commands/messages and dedicated ephemeral edit methods: https://core.telegram.org/bots/api#ephemeral-messages-and-commands and https://core.telegram.org/bots/api#editephemeralmessagetext . They can disappear and delivery is not guaranteed; non-admin bots have action-window restrictions. Test the deployed bot and clients.
- ForceReply provides native text input; it does not itself guarantee privacy. Use a verified ephemeral reply context: https://core.telegram.org/bots/api#forcereply .
- Original-message links support public/private supergroups and topics: https://core.telegram.org/api/links#message-links . Navigation requires a user action.
- Database and Telegram writes cannot share an atomic transaction. Durable synchronization and explicit failures are necessary.

## Review decisions

1. Confirmed: sent-occurrence edits from Telegram and Console use one backend.
2. Confirmed: rosters use member types; Members is the renameable default, and Admin/Editor can manage classifications.
3. The architecture readback was completed; implementation was subsequently authorized.
4. Review the recommendations for workspace-scoped single member types, selecting one or more audience types, and freezing the roster when sent.
5. Delivery timer: use the hourly Neon scheduled worker. No hosting upgrade, live bot configuration, production migration, or real test message is performed locally.

## Implementation constraints

- Ephemeral-only management and participant input; no private-chat fallback. Disappearing interactions restart.
- Keep the hourly Neon worker. Automatic calendar-date messages send when it runs; daily/weekly/monthly rules decide eligibility. Add Send now for manually triggered occurrences. No time-of-day guarantee and no native Telegram bot scheduling.
- Implementation is authorized. Schema, API operations, and worker functions are checked into the repository; this design does not claim that production cutover or a real test message has occurred.
