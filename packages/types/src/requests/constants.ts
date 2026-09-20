import type { Priority } from "./priority";
import type { Status } from "./status";

// Legacy category metadata remains as a visual fallback for existing keys.
// Workspace-managed category names are loaded from request_categories.
export const categoryLabel: Record<string, string> = {
    video_production: "Video Production",
    video_shooting: "Video Shooting",
    graphic_design: "Graphic Design",
    event: "Event",
    education: "Education",
};

export const statusLabel: Record<Status, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    archived: "Archived",
};

export const priorityLabel: Record<Priority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
};

// ─── Colors ────────────────────────────────────────────

export const statusColor = {
    not_started: "gray",
    in_progress: "yellow",
    completed: "green",
    archived: "gray",
} as const satisfies Record<Status, string>;

export const priorityColor = {
    urgent: "red",
    high: "yellow",
    medium: "blue",
    low: "gray",
} as const satisfies Record<Priority, string>;

export const categoryColor: Record<string, "orange" | "purple" | "blue" | "green" | "gray"> = {
    video_production: "orange",
    video_shooting: "orange",
    graphic_design: "purple",
    event: "blue",
    education: "green",
};

export const eventColorMap: Record<string, string> = {
    red: "bg-error_primary text-error",
    orange: "bg-warning_primary text-warning",
    yellow: "bg-warning_primary text-warning",
    green: "bg-success_primary text-success",
    blue: "bg-utility-blue-50 text-color-utility-blue-700",
    purple: "bg-brand_primary text-brand_secondary",
    gray: "bg-secondary text-tertiary",
};

// ─── Groups ────────────────────────────────────────────

export const statusGroups = [
    { key: "not_started", label: "Not Started", color: "gray" },
    { key: "in_progress", label: "In Progress", color: "yellow" },
    { key: "completed", label: "Completed", color: "green" },
] as const;

export function getCategoryLabel(category: string, managedName?: string): string {
    return managedName ?? categoryLabel[category] ?? category.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
