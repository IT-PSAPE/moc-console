import { createContext, useContext, useMemo, useState, type Key, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  emptyMessage: string
  getRowKey?: (row: T, index: number) => Key
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

interface RootProps<T> {
  children: ReactNode
  data: T[]
  emptyMessage?: string
  getRowKey?: (row: T, index: number) => Key
  onRowClick?: (row: T) => void
  renderCard?: (row: T, index: number) => ReactNode
}

function Root<T>({ children, data, emptyMessage = 'No data found', getRowKey, onRowClick, renderCard }: RootProps<T>) {
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
      meta: {
        emptyMessage,
        getRowKey: getRowKey as ((row: unknown, index: number) => Key) | undefined,
        onRowClick: onRowClick as ((row: unknown) => void) | undefined,
      },
    }}>
      {renderCard && (
        <div className="space-y-3 sm:hidden">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-border-secondary bg-background-primary px-4 py-8 text-center text-sm text-text-tertiary">
              {emptyMessage}
            </div>
          ) : (
            sorted.map((row, index) => (
              <div key={getRowKey?.(row, index) ?? index}>
                {renderCard(row, index)}
              </div>
            ))
          )}
        </div>
      )}

      <div className={renderCard ? 'hidden sm:block' : ''}>
        <div className="overflow-x-auto rounded-lg border border-border-secondary">
          <table className="w-full text-sm">
            {children}
          </table>
        </div>
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
  const ariaSort = active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'

  function handleSort() {
    setSorting(field)
  }

  return (
    <th
      aria-sort={sortable ? ariaSort : undefined}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary ${sortable ? 'cursor-pointer select-none hover:text-text-secondary' : ''} ${className}`}
      scope="col"
    >
      {sortable ? (
        <Button className="-mx-2 h-auto min-h-0 gap-1 px-2 py-0 text-left text-xs font-medium uppercase tracking-wider" onClick={handleSort} size="sm" variant="ghost">
          <span>{children}</span>
          {active ? (
            sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1">{children}</span>
      )}
    </th>
  )
}

// ── Body ─────────────────────────────────────────────────────

function Body<T>({ render }: { render: (row: T, index: number) => ReactNode }) {
  const { state: { data }, meta: { emptyMessage, getRowKey, onRowClick } } = useTableContext<T>()

  return (
    <tbody>
      {data.length === 0 ? (
        <tr>
          <td colSpan={100} className="px-4 py-12 text-center text-text-tertiary">
            {emptyMessage}
          </td>
        </tr>
      ) : (
        data.map((row, i) => (
          <TableBodyRow key={getRowKey?.(row, i) ?? i} row={row} onRowClick={onRowClick}>
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
