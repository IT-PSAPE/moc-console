import { cn } from "@moc/utils/cn";
import type { HTMLAttributes } from "react";

function GroupedListRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-4", className)} {...props}>{children}</div>;
}

function GroupedListGroup({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("flex flex-col gap-1.5 rounded-lg border border-tertiary bg-secondary_alt p-1.5", className)} {...props}>{children}</section>;
}

function GroupedListHeader({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn("flex min-h-8 items-center gap-1.5 px-1.5", className)} {...props}>{children}</header>;
}

function GroupedListContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props}>{children}</div>;
}

export const GroupedList = Object.assign(GroupedListRoot, {
  Content: GroupedListContent,
  Group: GroupedListGroup,
  Header: GroupedListHeader,
});
