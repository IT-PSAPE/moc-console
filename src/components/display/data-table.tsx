import { type ReactNode } from "react";
import { Table } from "./table";
import { cn } from "@/utils/cn";


type Column<T> = {
  key: string;
  header: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (value: T[keyof T], row: T, index: number) => ReactNode;
  accessor?: (row: T) => unknown;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: string | ((row: T, index: number) => string);
  emptyMessage?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  className,
  onRowClick,
  rowClassName,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  function getCellValue(row: T, column: Column<T>) {
    if (column.accessor) return column.accessor(row);
    return row[column.key];
  }

  return (
    <Table className={cn("w-full", className)}>
      <Table.ColGroup>
        {columns.map((col) => (
          <Table.Col key={col.key} width={col.width} />
        ))}
      </Table.ColGroup>

      <Table.Head>
        <Table.Row>
          {columns.map((col) => (
            <Table.Header
              key={col.key}
              className={cn(
                "px-3 py-2",
                col.align === "center" && "text-center",
                col.align === "right" && "text-right",
                col.className,
              )}
            >
              {col.header}
            </Table.Header>
          ))}
        </Table.Row>
      </Table.Head>

      <Table.Body className="bg-primary">
        {data.length === 0 ? (
          <Table.Row>
            <Table.Cell className="px-3 py-6 text-center text-tertiary" colSpan={columns.length}>
              {emptyMessage}
            </Table.Cell>
          </Table.Row>
        ) : (
          data.map((row, rowIndex) => (
            <Table.Row
              key={rowIndex}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-gray-50",
                typeof rowClassName === "function"
                  ? rowClassName(row, rowIndex)
                  : rowClassName,
              )}
              onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
            >
              {columns.map((col) => {
                const value = getCellValue(row, col);
                return (
                  <Table.Cell
                    key={col.key}
                    className={cn(
                      "px-3 py-2",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.className,
                    )}
                  >
                    {col.render
                      ? col.render(value as T[keyof T], row, rowIndex)
                      : (value as ReactNode)}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))
        )}
      </Table.Body>
    </Table>
  );
}
