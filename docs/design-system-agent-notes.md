# Working notes for the design-system pass (for agents)

Read `docs/design-system.md` first. These notes cover how to verify visually.

## App under test
- Console dev server is already running at http://localhost:5173 (Vite, HMR).
  API is running on :3001. Do **not** start or restart either server.
- Data loads slowly (remote DB). After `goto`, wait for the `h1` and a settle:
  `playwright-cli -s=<session> run-code "async page => { await page.waitForSelector('h1', {timeout: 40000}).catch(()=>{}); await page.waitForTimeout(800); }"`
- Login: email `craigchihururu@gmail.com`, password `ThisisHero#36`. A saved
  storage state exists at
  `/private/tmp/claude-501/-Users-Craig-Developer-Projects-moc-console/c9db2550-4039-490e-a8c4-4337f7fe7475/scratchpad/auth.json`.

## Browser: use playwright-cli with your OWN session name
Never use the default session; always pass `-s=<your-session-name>` (the name
given in your task). Example bootstrap:

```bash
S=/private/tmp/claude-501/-Users-Craig-Developer-Projects-moc-console/c9db2550-4039-490e-a8c4-4337f7fe7475/scratchpad
P() { playwright-cli -s=MYSESSION "$@"; }
P open http://localhost:5173/login
P resize 1440 900
P state-load $S/auth.json
P goto http://localhost:5173/requests
P run-code "async page => { await page.waitForSelector('h1', {timeout: 40000}).catch(()=>{}); await page.waitForTimeout(800); }"
P screenshot --filename=$S/shots/MYSESSION-requests.png
```
- If state-load leaves you on /login, log in with
  `P fill "getByRole('textbox', { name: 'Email' })" "craigchihururu@gmail.com"` and
  `P fill "getByRole('textbox', { name: 'Password' })" "ThisisHero#36" --submit`.
- Phone check: `P resize 390 844` (the `landscape:` tier), then screenshot.
- Element screenshots: `P screenshot "getByRole('dialog')" --filename=...`.
- Measure heights: `P --raw eval "JSON.stringify([...document.querySelectorAll('button')].slice(0,12).map(b => [b.textContent.trim().slice(0,20), b.getBoundingClientRect().height]))"`.
- Use `P snapshot --filename=$S/snap.yml` then grep it for refs; `P click <ref>`.
- When done: `P close`.
- Save screenshots under `$S/shots/` and look at them with the Read tool.
  Screenshots inside the repo are not allowed except under `.playwright-mcp/` (gitignored).


## READ-ONLY VERIFICATION — this environment holds real workspace data
The console is connected to the live database. During verification you may
ONLY look. Concretely:
- Never click buttons that mutate state: Save, Create, Delete, Disconnect,
  Connect, Send, Schedule, Archive, Return, Check out, Approve, Reject, Resend,
  role/status selects, toggles, drag-and-drop, "Done" in filter drawers that
  persist filters is fine, but nothing that writes to the server.
- Open modals, drawers and dropdowns to look at them, then close them with
  `P press Escape` or the Cancel button. Never press the confirm button.
- Do not type into inline-editable titles or detail-page fields (some autosave
  on blur). Typing into a page search box is fine.
- If a page has only destructive actions available to open an overlay (e.g. a
  Delete confirmation), open it, screenshot, and press Escape.
- If you accidentally mutate anything, say so explicitly in your report.

## Editing rules
- Only edit the files listed in your task. If a fix needs a shared primitive
  you do not own, write the request into your final report instead of editing it.
- Do not revert uncommitted changes that already exist in the working tree
  (`git diff <file>` before editing files flagged as modified).
- No new dependencies. No new components when an existing one can be extended
  (AGENTS.md). Use `cn`/`cv` from `@moc/utils`.
- Keep `landscape:` touch sizing (44px) on controls — see §1 of the spec.
- Typecheck your files when done: `cd apps/console && npx tsc -b --pretty false 2>&1 | head -40`
  (takes ~15s). Errors in files you do not own may be another agent mid-edit;
  re-run once after a minute before reporting them.
- Transient Vite error overlays caused by another agent's half-edited file:
  wait ~20s and reload (`P reload`).

## Report format (final message)
1. Files changed (path list).
2. What was wrong → what it is now, per component/page (one line each).
3. Measurements after: control heights, row heights on the pages you own.
4. Anything you could not fix and why (with the file + line).
5. Requests for shared-primitive changes you need from the lead.
