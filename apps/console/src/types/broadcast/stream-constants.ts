import type { StreamStatus, StreamPrivacy, LatencyPreference } from "./stream"

// ─── Labels ────────────────────────────────────────────

export const streamStatusLabel: Record<StreamStatus, string> = {
  created: "Scheduled",
  ready: "Ready",
  live: "Live",
  complete: "Completed",
}

export const streamPrivacyLabel: Record<StreamPrivacy, string> = {
  public: "Public",
  private: "Private",
  unlisted: "Unlisted",
}

export const latencyPreferenceLabel: Record<LatencyPreference, string> = {
  normal: "Normal",
  low: "Low",
  ultraLow: "Ultra Low",
}

export const latencyPreferenceHint: Record<LatencyPreference, string> = {
  normal: "Best quality. Full DVR support.",
  low: "Reduced latency. DVR window may be limited.",
  ultraLow: "Lowest latency. DVR is disabled.",
}

// ─── Colors ────────────────────────────────────────────

export const streamStatusColor: Record<StreamStatus, "gray" | "yellow" | "red" | "green"> = {
  created: "gray",
  ready: "yellow",
  live: "red",
  complete: "green",
}
