# Unified playlist playback engine (`@moc/player`)

The Console preview and MOC Broadcast had diverged into two half-built clocks (a minute-scaled cue-sheet `ClockTransport` wired into the playlist Timeline by mistake, and a separate `setInterval` wall-clock in `apps/broadcast`), so the editor playhead moved but nothing actually played and the two surfaces behaved differently. We are extracting **one** playlist playback engine into a new package `@moc/player` — an authoritative master-clock transport plus a lane-priority alpha compositor — consumed by both the Console **Broadcasts section** preview and the **MOC Broadcast** player, so authoring and playback are the same code and the same experience.

## Decision

- **Authoritative master clock.** A seconds-accurate ticker (`play/pause/seek`, loops at playlist length) is the single source of truth. Every media element is a pure **subscriber** that each frame computes — from its `startSec`, `inPoint`/`outPoint`, and the master delta — whether it is active and its desired position/play-state, then reconciles to it. The clock **never waits for media**.
- **Soft catch-up.** ~0.25 s dead-band (play naturally); beyond it, rubber-band via `playbackRate` (~0.9–1.1×) back to the clock. Hard seek only on (a) a block becoming active (seek to `inPoint`), (b) explicit user seek/scrub, (c) catastrophic drift (>~2 s). Images show/hide on their window; audio follows the same rule.
- **Program = lane-priority alpha composite.** Every lane's active block renders simultaneously, stacked **Lane 01 frontmost**; opaque pixels occlude, transparent pixels and gaps reveal lanes behind, ultimately black. Audio lanes never render visually (mix only).
- **Boundary.** `@moc/player` depends on `@moc/types` (Playlist/Cue/`resolveLaneTimeline`) and `@moc/ui` (tokens), **not** `@moc/data`; it receives an already-fetched `Playlist` + a media-URL resolver. It exports the Transport (the editor feeds it into the Timeline primitive's existing injected port — the primitive stays domain-free per ADR-0003) and the compositor component. Controls, idle-hide, fullscreen, the autoplay start-gesture, and audio policy (Console preview muted; MOC Broadcast audible) stay **per-app chrome**.

## Status

Accepted (2026-05-16). Supersedes the "media is the clock" resolution in **ADR-0003** *for the playlist domain only* (the Timeline primitive itself remains clock-free and domain-agnostic). Amends **ADR-0004** (lane order was bottom-up base-at-back; it is now front-to-back, Lane 01 frontmost). Realises **ADR-0002**'s deferred "playback runtime is genuinely new code" as a shared package rather than per-app code.

## Considered options

- **Clock follows the frontmost playing video (media-leashed).** ADR-0003's stated intent; rejected: a buffering video would stall the whole timeline, and image-only/gap spans have no clock. An authoritative clock with reconciling subscribers gives one predictable timeline for a display board.
- **Hard-skip catch-up** (snap lagging media to position). Rejected in favour of soft rubber-banding — visually smoother; hard seeks reserved for the three exceptions.
- **Pure priority occlusion** (Lane 01 active ⇒ nothing else renders). Rejected: kills alpha overlays (a transparent PNG/lower-third over video must let the background through). The model is alpha compositing by priority, not occlusion.
- **Engine in `@moc/ui`** or **app-local + cross-imported.** Rejected: the first puts playlist-domain code in the domain-free design/primitive package (ADR-0003); the second breaks monorepo package boundaries.

## Consequences

- `CONTEXT.md`'s **Transport** entry is rewritten and a **Program** term added; two flagged ambiguities (playlist clock direction, lane z-order) are resolved here.
- The minute-vs-second `ClockTransport` mismatch that froze the editor preview disappears — the playlist no longer uses the cue-sheet clock at all.
- Single-lane image/video playlists remain a degenerate case, so existing published playlists keep playing.
- A stalled frontmost video can let the **Program** briefly drift out of A/V sync (clock keeps running, media rubber-bands back) — an accepted trade for a never-stalling display board.
