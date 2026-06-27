import { supabase } from "@moc/data/supabase";

// Per-workspace stale-item config. The threshold is both the "flag after
// N days idle" window and the re-nag cadence (the daily sweep re-alerts
// each item at most once per window). Default matches the DB default.
export const DEFAULT_STALE_THRESHOLD_DAYS = 3;

export type NotificationSettings = {
  workspaceId: string;
  staleThresholdDays: number;
};

export async function fetchNotificationSettings(workspaceId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("stale_threshold_days")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    workspaceId,
    staleThresholdDays: data?.stale_threshold_days ?? DEFAULT_STALE_THRESHOLD_DAYS,
  };
}

export async function updateStaleThresholdDays(workspaceId: string, days: number): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      { workspace_id: workspaceId, stale_threshold_days: days },
      { onConflict: "workspace_id" },
    );
  if (error) throw new Error(error.message);
}
