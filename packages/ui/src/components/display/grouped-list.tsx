import { ListSurfaceContext } from "./list-surface-context";
import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

// Stacked groups (e.g. status groups on a collection page) sit a page-section
// gap (gap-6/24px) apart.
function GroupedListRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-6", className)} {...props}>{children}</div>;
}

function GroupedListGroup({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("flex min-w-0 flex-col", className)} {...props}>{children}</section>;
}

// Group label above the card: a status dot (render `<Indicator.Dot className="size-2" />`,
// not the ringed `<Indicator />`) + a quiet label-xs caption, not a bold row title.
function GroupedListHeader({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn("flex items-center gap-2 px-1 pb-2 label-xs text-quaternary", className)} {...props}>{children}</header>;
}

function GroupedListContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ListSurfaceContext.Provider value={true}><div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs divide-y divide-secondary", className)} {...props}>{children}</div></ListSurfaceContext.Provider>;
}

export const GroupedList = Object.assign(GroupedListRoot, {
  Content: GroupedListContent,
  Group: GroupedListGroup,
  Header: GroupedListHeader,
});
