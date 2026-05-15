# Reunify MOC Request into MOC Console as a bun-workspaces monorepo

MOC Request was split out of MOC Console previously and has since drifted on shared primitives (button, input, index.css tokens) while sharing very little new code. To restore a single design system and shared data layer without forcing the apps to merge, we are converting this repo into a bun-workspaces monorepo with `apps/console` + `apps/request` and four shared packages (`@moc/ui`, `@moc/data`, `@moc/utils`, `@moc/types`). MOC Request's git history is preserved via `git subtree add --prefix=apps/request`.

## Considered options

- **Keep two repos, publish `@moc/ui` to a registry.** Rejected: too much ceremony for two private apps; release cadence becomes a friction point for every shared change.
- **One shared package only (`@moc/shared`).** Rejected: collapses unrelated concerns (UI vs data vs pure utils) into one dep graph; tree-shaking is fine but the boundary clarity is worth the extra package.
- **Narrow shared kernel; keep components per-app.** Rejected: accepts the drift instead of fixing it. The user explicitly wants to converge to a single canonical primitive set.
- **Converge components in MOC Request to its own canonical set.** Rejected: MOC Console has more polish (active states, broader tokens) and the larger surface area; making it canonical minimises churn.
- **pnpm or npm workspaces.** Rejected: MOC Console already uses bun; consolidating on it keeps install/run commands consistent with current workflow.

## Consequences

- **Canonical design lives in `@moc/ui`** — MOC Request's diverged button/input/index.css are overwritten with MOC Console's variants. Intentional UI differences (e.g. MOC Request's fixed-height inputs for touch) must be re-expressed as props/variants on the canonical components, not separate components.
- **`@moc/data` exports only the bare Supabase client.** The original plan was to bundle all fetchers here as a flat layer, but in practice MOC Console's data files transitively depend on console-only libs (`api-auth`, `youtube-client`, `zoom-client`) and MOC Request's public-flow operations (`public_browse_equipment` RPC, tracking-code lookups, HMAC-signed notify forwarders) are fundamentally different operations — not drift. Each app keeps its own `data/` directory; `@moc/data` is the shared foundation, not a shared façade.
- **OAuth side-effects** (YouTube + Zoom redirect interceptors) moved out of `lib/supabase.ts` into `apps/console/src/lib/oauth-interceptors.ts`, imported as the first line of `main.tsx` so they run before the Supabase client is constructed.
- **`@moc/ui` owns shared CSS tokens + base + component styles.** App-specific overrides (PWA tap-highlight, mobile root font-size, overscroll behaviour) stay in each app's own `app.css`, layered on top of `@moc/ui/styles.css`.
- **Some "primitives" had data dependencies** and had to stay app-local: the timeline component (uses Supabase realtime via `use-playback-sync`), the error boundary (renders console's report-bug modal), and a handful of data fetchers that reach into console-only auth libs. These live in `apps/console/src/components/` and `apps/console/src/data/`, not in packages.
- **`@moc/types` is shared but only console's domain types live there for now.** MOC Request keeps its own narrower types (`PublicEquipmentItem`, `RequestFormData`, `TrackingResult`) app-local because they are public-flow specific. If the two diverge further, consider an `@moc/types/public` namespace.
- **Vercel projects need rework.** Each app keeps its own `vercel.json`, but Vercel project settings must be updated to set `rootDirectory` to `apps/console` and `apps/request` respectively. The existing MOC Request Vercel project (if pointed at `craig-ckc/moc-request`) needs to be repointed at the monorepo with the new root directory.
- **`craig-ckc/moc-request` is archived** after the monorepo lands. `IT-PSAPE/moc-console` becomes the monorepo home.
- **CONTEXT.md evolves.** The root `CONTEXT.md` covers shared language. Once both apps stabilise, consider promoting to `CONTEXT-MAP.md` if each app develops enough app-specific terminology to warrant its own glossary.
