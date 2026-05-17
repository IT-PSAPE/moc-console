// @moc/player — the one playlist playback engine shared by the Console
// Broadcasts preview and MOC Broadcast (ADR-0005). Transport + compositor
// only; chrome (controls, fullscreen, start-gesture, audio policy) stays
// per-app. Depends on @moc/types/@moc/ui/@moc/utils, never @moc/data.
export { createPlaylistClock, usePlaylistClock, type PlaylistClock, type PlaylistClockOptions } from "./clock"
export { ProgramCompositor, usePlaylistProgram, type ResolvedLane } from "./program-compositor"
