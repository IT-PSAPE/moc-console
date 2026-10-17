import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, type ColHTMLAttributes } from "react";
import { cn } from "@moc/utils/cn";


function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-secondary px-4 py-3 paragraph-sm text-tertiary align-middle", className)} {...props} />
  );
}

// No vertical borders anywhere. `last:*:border-b-0` drops the bottom border
// off every cell in the last row; `hover:bg-secondary` highlights the whole row.
function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("last:*:border-b-0 hover:bg-secondary", className)} {...props} />
  );
}

function TableHeader({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("h-9 border-b border-secondary px-4 text-left label-xs font-semibold text-quaternary whitespace-nowrap align-middle", className)} {...props} />
  );
}

function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-secondary", className)} {...props} />
  );
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn(className)} {...props} />
  );
}

function TableColGroup({ className, ...props }: HTMLAttributes<HTMLTableColElement>) {
  return (
    <colgroup className={cn(className)} {...props} />
  );
}

function TableCol({ width, className, style, ...props }: ColHTMLAttributes<HTMLTableColElement>) {
  return (
    <col style={{ width, ...style }} className={cn(className)} {...props} />
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("isolate w-full border-separate border-spacing-0 paragraph-sm", className)} {...props} />
  );
}

Table.Body = TableBody;
Table.Col = TableCol;
Table.ColGroup = TableColGroup;
Table.Head = TableHead;
Table.Header = TableHeader;
Table.Row = TableRow;
Table.Cell = TableCell;
