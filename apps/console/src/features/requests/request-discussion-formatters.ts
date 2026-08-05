import type { RequestActivity, RequestHistoryActor } from "@moc/types/requests";
import { statusLabel } from "@moc/types/requests";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

type ActivityCopy = {
  title: string;
  description: string | null;
};

function getStringDetail(activity: RequestActivity, key: string): string | null {
  const value = activity.details[key];
  return typeof value === "string" ? value : null;
}

export function formatRequestActor(actor: RequestHistoryActor | null): string {
  const name = actor ? `${actor.name} ${actor.surname}`.trim() : "System";
  return name || "System";
}

export function formatRequestActivity(activity: RequestActivity): ActivityCopy {
  if (activity.type === "created") {
    const requesterName = getStringDetail(activity, "requester_name");
    return { title: "Request submitted", description: requesterName ? `Submitted by ${requesterName}` : null };
  }

  if (activity.type === "title_updated") {
    return { title: "Updated request title", description: null };
  }

  if (activity.type === "status_changed") {
    const fromStatus = getStringDetail(activity, "from_status");
    const toStatus = getStringDetail(activity, "to_status");
    const fromLabel = fromStatus && fromStatus in statusLabel ? statusLabel[fromStatus as keyof typeof statusLabel] : fromStatus;
    const toLabel = toStatus && toStatus in statusLabel ? statusLabel[toStatus as keyof typeof statusLabel] : toStatus;
    return { title: "Changed request status", description: fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : null };
  }

  return { title: "Updated request details", description: null };
}

export function formatRequestHistoryTimestamp(value: string): string {
  return formatUtcIsoInBrowserTimeZone(value);
}
