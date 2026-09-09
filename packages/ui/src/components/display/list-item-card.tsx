import { cn } from "@moc/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

function ListItemCardRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full min-w-0 items-start gap-3 px-3 py-3 md:px-4", className)} {...props}>
      {children}
    </div>
  );
}

function ListItemCardLeading({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary text-tertiary", className)} {...props}>
      {children}
    </div>
  );
}

function ListItemCardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", className)} {...props}>
      {children}
    </div>
  );
}

function ListItemCardTitle({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("label-sm block truncate", className)} {...props}>{children}</span>;
}

function ListItemCardSubtitle({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("paragraph-sm truncate text-tertiary", className)} {...props}>{children}</p>;
}

function ListItemCardMeta({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-quaternary", className)} {...props}>
      {children}
    </div>
  );
}

type ListItemCardMetaItemProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
};

function ListItemCardMetaItem({ children, className, icon, ...props }: ListItemCardMetaItemProps) {
  return (
    <span className={cn("paragraph-xs flex min-w-0 items-center gap-1.5", className)} {...props}>
      {icon && <span className="shrink-0 *:size-3.5">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

function ListItemCardTrailing({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-1.5 self-center", className)} {...props}>
      {children}
    </div>
  );
}

export const ListItemCard = Object.assign(ListItemCardRoot, {
  Content: ListItemCardContent,
  Leading: ListItemCardLeading,
  Meta: ListItemCardMeta,
  MetaItem: ListItemCardMetaItem,
  Root: ListItemCardRoot,
  Subtitle: ListItemCardSubtitle,
  Title: ListItemCardTitle,
  Trailing: ListItemCardTrailing,
});
