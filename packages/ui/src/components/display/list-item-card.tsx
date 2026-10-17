import { cn } from "@moc/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * Composition: Root > Leading? + Content(Title + Subtitle? + Meta?) + Trailing?.
 *
 * Desktop target is a single 56px row (`min-h-14`, `py-2` so a two-line
 * title/subtitle stack lands at 58px): Leading sits on the left,
 * Content's title/subtitle stack fills the middle, and Trailing holds actions
 * pinned to the right. To get Meta onto that same row (inline with Trailing)
 * rather than wrapped under the title, compose it as a child of Trailing:
 *
 *   <ListItemCard.Trailing>
 *     <ListItemCard.Meta>…</ListItemCard.Meta>
 *     <Button.Icon .../>
 *   </ListItemCard.Trailing>
 *
 * Meta nested inside Content (after Title/Subtitle — the older pattern, still
 * supported) renders as a wrapped line under the subtitle instead; keep it to
 * two lines of text on desktop.
 *
 * Root is a container (`@container/row`). When the row itself is narrower than
 * 36rem — a kanban card, a drawer, a phone — Trailing drops onto its own line
 * under Content and left-aligns, so Content never gets squeezed. This is a
 * container query, not a viewport tier, so it works inside narrow columns on
 * desktop too.
 */
function ListItemCardRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("@container/row flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 min-h-14 landscape:px-3", className)} {...props}>
      {children}
    </div>
  );
}

// `*:size-4` only targets a bare icon — many rows instead put a sized
// `UserAvatar`/`Avatar` (or a control like `Toggle`) in Leading, so it is not
// forced on every child; icon-tile consumers get it via `[&_svg]:size-4`.
function ListItemCardLeading({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-tertiary [&_svg]:size-4", className)} {...props}>
      {children}
    </div>
  );
}

function ListItemCardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-1 basis-40 flex-col justify-center gap-0.5", className)} {...props}>
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
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 paragraph-xs text-tertiary", className)} {...props}>
      {children}
    </div>
  );
}

type ListItemCardMetaItemProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
};

function ListItemCardMetaItem({ children, className, icon, ...props }: ListItemCardMetaItemProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)} {...props}>
      {icon && <span className="shrink-0 *:size-3.5">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

function ListItemCardTrailing({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-3 @max-[36rem]/row:basis-full @max-[36rem]/row:justify-start", className)} {...props}>
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
