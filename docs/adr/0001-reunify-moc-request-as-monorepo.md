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
- **`@moc/data` exports a bare Supabase client.** OAuth side-effects (YouTube + Zoom redirect interceptors) currently in `lib/supabase.ts` move into `apps/console` as a startup-time module — they only make sense in the console.
- **`@moc/data` is flat.** Public and authenticated fetchers live alongside each other. RLS (not package boundaries) enforces access; tree-shaking ensures MOC Request only bundles what it imports. Re-evaluate if confusion arises.
- **`@moc/ui` owns shared CSS tokens + base + component styles.** App-specific overrides (PWA tap-highlight, mobile root font-size, overscroll behaviour) stay in each app's own `index.css`, which imports `@moc/ui`'s stylesheet.
- **Vercel projects need rework.** Each app keeps its own `vercel.json`, but Vercel project settings must be updated to set `rootDirectory` to `apps/console` and `apps/request` respectively. The existing MOC Request Vercel project (if pointed at `craig-ckc/moc-request`) needs to be repointed at the monorepo with the new root directory.
- **`craig-ckc/moc-request` is archived** after the monorepo lands. `IT-PSAPE/moc-console` becomes the monorepo home.
- **CONTEXT.md evolves.** The root `CONTEXT.md` covers shared language. Once both apps live in `apps/`, consider promoting to `CONTEXT-MAP.md` if each app develops enough app-specific terminology to warrant its own glossary.
