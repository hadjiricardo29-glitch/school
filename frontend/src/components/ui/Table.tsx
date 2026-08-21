import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

/** Table desktop classique ; devient une liste de cartes empilées sur mobile. */
export function Table<T>({ columns, data, rowKey, emptyMessage = "Aucune donnée", onRowClick }: TableProps<T>) {
  if (data.length === 0) {
    return <div className="py-12 text-center text-sm text-text-secondary">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              {columns.map((col) => (
                <th key={col.key} className={cn("py-3 pr-4 font-medium", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn("border-b border-border last:border-0", onRowClick && "cursor-pointer hover:bg-surface-alt")}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("py-3 pr-4 text-text-primary", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:hidden">
        {data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={cn("rounded-[10px] border border-border p-4", onRowClick && "cursor-pointer active:bg-surface-alt")}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-text-secondary">{col.header}</span>
                <span className="text-right text-text-primary">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
