import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, type ColHTMLAttributes } from "react";
import { cn } from "@/utils/cn";


function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-r last:border-r-0 border-b border-secondary", className)} {...props} />
  );
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn(className, 'last:*:border-b-0')} {...props} />
  );
}

function TableHeader({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("font-semibold bg-gray-100 border-r last:border-r-0 !border-b border-secondary text-left", className)} {...props} />
  );
}

function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("border border-secondary", className)} {...props} />
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
    <table className={cn("isolate border-separate border-spacing-0 border-secondary paragraph-sm", className)} {...props} />
  );
}

Table.Body = TableBody;
Table.Col = TableCol;
Table.ColGroup = TableColGroup;
Table.Head = TableHead;
Table.Header = TableHeader;
Table.Row = TableRow;
Table.Cell = TableCell;
