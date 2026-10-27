# Console push notifications

Console supports opt-in Web Push in the browser and installed PWA. Request and Broadcast do not register a push worker. Users enable or disable notifications for the current browser from **Edit profile**. Enabling is a separate device preference and takes effect immediately. No business events send push automatically yet.

The `/sw.js` worker displays notifications and opens Console links. It has no fetch handler and does not cache application pages or API responses. It replaces the retired Workbox worker at the same URL.

## Deployment

1. Apply `neon/database/console-push.sql` with the database migration owner in a transaction, then run `neon/database/verify-console-push.sql`. Fresh database builds include both files. Existing users and Telegram notification tables are unchanged.
2. Generate a VAPID key pair once per environment into a new private file:

   ```sh
   node apps/api/scripts/generate-web-push-keys.ts /absolute/private/path/console-push.env mailto:ops@example.com
   ```

   The file is created with mode 0600 and cannot overwrite an existing file. Set `WEB_PUSH_VAPID_PUBLIC_KEY` in the API environment. Copy all three values (`WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_VAPID_SUBJECT`) into the environment used to evaluate `neon.ts`. Keep the private key in the delivery worker environment; never use a `VITE_` variable. The API returns only the public key. Retain the same pair across deployments; changing it requires devices to subscribe again.
3. Deploy the API, Console, and the Neon `consolepush` Function using the existing release workflow. The function queries its branch's database through the existing backend pool. Its `moc-console-push-minutely` trigger runs once per minute only when `MOC_ENABLE_PRODUCTION_JOBS=true` and `MOC_NEON_BRANCH=production`, following the existing production job gate. Inherited preview schedules remain disabled.
4. Open Console over HTTPS, enable notifications in Edit profile, and send a test notification. Allow up to a minute for the worker. Confirm that it appears with Console closed and opens Console when clicked. Repeat on the supported target devices.

Push remains unavailable when VAPID configuration is absent. Browser permission is requested only after the user chooses to enable notifications. On iPhone/iPad the user must first add Console to the Home Screen and open it there; see [WebKit's Web Push support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Adding notification events later

Server code can enqueue a notification for a user through `enqueueConsolePush` in `apps/api/server/push/delivery-store.ts`, with an event key and `{ title, body, url, tag }` payload. Use a stable event key to deduplicate repeated event handling. Include the workspace ID for workspace notifications; delivery checks current membership again before sending. Call the enqueue helper from the authorized server event flow, never directly from a browser-provided recipient or payload. Its optional database client must belong to a trusted worker transaction; application-role transactions cannot write the delivery queue. Future event integrations that need atomicity must enqueue in a worker transaction or add an authorized transactional outbox.

Subscriptions live in `moc_private.console_push_subscriptions`, with per-user row security. An endpoint has one owner; registration rejects a different account's existing endpoint. Signing out attempts server cleanup while the session is valid and unsubscribes locally even when offline. A different account explicitly opts in with a new browser subscription. The worker-only `moc_private.console_push_deliveries` queue records retries and delivery outcomes. Disabling a subscription deletes its queued deliveries. Expired endpoints are removed when the provider responds 404 or 410. Delivery is at least once: a lost provider response can cause a retry after acceptance, so use a stable payload tag to replace duplicates when appropriate. Push provider acceptance does not guarantee that the operating system displayed it.

The implementation uses the existing Neon Functions/SQL infrastructure and Node's built-in crypto, with no additional service or package. It follows [RFC 8291 message encryption](https://www.rfc-editor.org/rfc/rfc8291.html) and [RFC 8292 VAPID authentication](https://www.rfc-editor.org/rfc/rfc8292.html). The Neon schedule and environment handling follow the official [trigger](https://neon.com/docs/cli/triggers) and [environment variable](https://neon.com/docs/compute/functions/environment-variables) documentation.

## Verification

Run `bash test/scripts/console-push.integration.sh` for the additive migration and actual API ownership checks in a disposable, socket-only local PostgreSQL cluster. Focused Vitest tests cover encryption, VAPID signatures, push response handling, queue retries, worker envelopes, device lifecycle, and notification click behavior. Run the API, Console, and Neon builds before release. Real browser-provider delivery still requires the deployment and device check above.
