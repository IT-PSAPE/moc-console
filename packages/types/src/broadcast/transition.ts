// Cue-to-cue transition. The MOC Broadcast v1 player renders "cut"
// only; "fade" and "crossfade" are modelled for later and use
// Playlist.transitionDurationMs.
export type PlaylistTransition = "cut" | "fade" | "crossfade"
