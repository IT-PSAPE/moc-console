import type { Category } from "./category";
import type { Priority } from "./priority";
import type { Status } from "./status";

// ─── Labels ────────────────────────────────────────────

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

export const categoryLabel: Record<Category, string> = {
    video_production: "Video Production",
    video_shooting: "Video Shooting",
    graphic_design: "Graphic Design",
    event: "Event",
    education: "Education",
};

// ─── Colors ────────────────────────────────────────────

export const priorityColor = {
    urgent: "red",
    high: "yellow",
    medium: "blue",
    low: "gray",
} as const satisfies Record<Priority, string>;

export const categoryColor = {
    video_production: "orange",
    video_shooting: "orange",
    graphic_design: "purple",
    event: "blue",
    education: "green",
} as const satisfies Record<Category, string>;

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
