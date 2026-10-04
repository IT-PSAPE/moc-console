# Reunify MOC Request into MOC Console as a bun-workspaces monorepo

MOC Request was split out of MOC Console previously and had drifted on shared primitives (button, input, index.css tokens). To restore a single design system without forcing the apps to merge, the repository became a Bun workspaces monorepo with `apps/console` and `apps/request`. Shared packages now include `@moc/ui`, `@moc/sdk`, `@moc/utils`, and `@moc/types`. MOC Request's git history was preserved when it joined the monorepo.

## Considered options

- **Keep two repos, publish `@moc/ui` to a registry.** Rejected: too much ceremony for two private apps; release cadence becomes a friction point for every shared change.
- **One shared package only (`@moc/shared`).** Rejected: collapses unrelated concerns (UI vs data vs pure utils) into one dep graph; tree-shaking is fine but the boundary clarity is worth the extra package.
- **Narrow shared kernel; keep components per-app.** Rejected: accepts the drift instead of fixing it. The user explicitly wants to converge to a single canonical primitive set.
- **Converge components in MOC Request to its own canonical set.** Rejected: MOC Console has more polish (active states, broader tokens) and the larger surface area; making it canonical minimises churn.
- **pnpm or npm workspaces.** Rejected: MOC Console already uses bun; consolidating on it keeps install/run commands consistent with current workflow.

## Consequences

- **Canonical design lives in `@moc/ui`** — MOC Request's diverged button/input/index.css are overwritten with MOC Console's variants. Intentional UI differences (e.g. MOC Request's fixed-height inputs for touch) must be re-expressed as props/variants on the canonical components, not separate components.
- **`@moc/sdk` is the typed application boundary.** It exposes named public and authenticated capabilities over the MOC API. Apps retain small `src/data/` service modules for feature-specific orchestration and local drafts; database access and provider credentials stay server-side.
- **OAuth side effects** for YouTube and Zoom remain in the Console callback flow and exchange credentials through the MOC API. The browser never receives provider tokens.
- **`@moc/ui` owns shared CSS tokens + base + component styles.** App-specific overrides (PWA tap-highlight, mobile root font-size, overscroll behaviour) stay in each app's own `app.css`, layered on top of `@moc/ui/styles.css`.
- **Feature-specific orchestration stays app-local.** Screens and hooks use shared UI and SDK capabilities, while presentation mappers, local drafts, and Console-only error reporting remain with their owning app.
- **`@moc/types` holds shared domain models used by both frontends.** Keep public request input and result types close to their SDK operation when their security or transport shape differs from the broader domain model.
- **Each deployable app has its own project root.** Console and Request use their app directories; the shared API is deployed separately and owns all server execution. Public frontends route application requests through same-origin API rewrites.
- **`craig-ckc/moc-request` is archived** after the monorepo lands. `IT-PSAPE/moc-console` becomes the monorepo home.
- **CONTEXT.md evolves.** The root `CONTEXT.md` covers shared language. Once both apps stabilise, consider promoting to `CONTEXT-MAP.md` if each app develops enough app-specific terminology to warrant its own glossary.
