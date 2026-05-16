// What happens when a playlist reaches its end. The MOC Broadcast v1
// player implements "loop" only; "stop" and "sequence" are modelled
// for later (sequence advances to Playlist.nextPlaylistId).
export type PlaybackMode = "loop" | "stop" | "sequence"
