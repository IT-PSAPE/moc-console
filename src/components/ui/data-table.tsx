import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ── Context ───────────────────────────────────────────────────

interface TableState<T> {
  data: T[]
  sortKey: string | null
  sortDir: 'asc' | 'desc'
}

interface TableActions {
  setSorting: (key: string) => void
}

interface TableMeta<T> {
  onRowClick?: (row: T) => void
}

interface TableContextValue<T> {
  state: TableState<T>
  actions: TableActions
  meta: TableMeta<T>
}

const TableContext = createContext<TableContextValue<unknown> | null>(null)

function useTableContext<T>() {
  const ctx = useContext(TableContext) as TableContextValue<T> | null
  if (!ctx) throw new Error('DataTable compound components must be used within DataTable.Root')
  return ctx
}

// ── TableBodyRow (internal) ────────────────────────────────────

function TableBodyRow<T>({ row, onRowClick, children }: { row: T; onRowClick?: (row: T) => void; children: ReactNode }) {
  function handleClick() {
    onRowClick?.(row)
  }

  return (
    <tr
      className={`border-b border-border-tertiary transition-colors hover:bg-background-primary_hover ${onRowClick ? 'cursor-pointer' : ''}`}
      onClick={onRowClick ? handleClick : undefined}
    >
      {children}
    </tr>
  )
}

// ── Root ──────────────────────────────────────────────────────

function Root<T>({ data, children, onRowClick }: { data: T[]; children: ReactNode; onRowClick?: (row: T) => void }) {
  const [sortKey, setSortKeyState] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function setSorting(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKeyState(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return (
    <TableContext.Provider value={{
      state: { data: sorted, sortKey, sortDir },
      actions: { setSorting },
      meta: { onRowClick: onRowClick as ((row: unknown) => void) | undefined },
    }}>
      <div className="overflow-x-auto rounded-lg border border-border-secondary">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    </TableContext.Provider>
  )
}

// ── Header ───────────────────────────────────────────────────

function Header({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border-secondary bg-background-secondary">
        {children}
      </tr>
    </thead>
  )
}

// ── Column ───────────────────────────────────────────────────

function Column({ field, children, sortable = false, className = '' }: { field: string; children: ReactNode; sortable?: boolean; className?: string }) {
  const { state: { sortKey, sortDir }, actions: { setSorting } } = useTableContext()
  const active = sortKey === field

  function handleSort() {
    setSorting(field)
  }

  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary ${sortable ? 'cursor-pointer select-none hover:text-text-secondary' : ''} ${className}`}
      onClick={sortable ? handleSort : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          active ? (
            sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          )
        )}
      </span>
    </th>
  )
}

// ── Body ─────────────────────────────────────────────────────

function Body<T>({ render }: { render: (row: T, index: number) => ReactNode }) {
  const { state: { data }, meta: { onRowClick } } = useTableContext<T>()

  return (
    <tbody>
      {data.length === 0 ? (
        <tr>
          <td colSpan={100} className="px-4 py-12 text-center text-text-tertiary">
            No data found
          </td>
        </tr>
      ) : (
        data.map((row, i) => (
          <TableBodyRow key={i} row={row} onRowClick={onRowClick}>
            {render(row, i)}
          </TableBodyRow>
        ))
      )}
    </tbody>
  )
}

// ── Cell ─────────────────────────────────────────────────────

function Cell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-text-secondary ${className}`}>
      {children}
    </td>
  )
}

export const DataTable = { Root, Header, Column, Body, Cell }
