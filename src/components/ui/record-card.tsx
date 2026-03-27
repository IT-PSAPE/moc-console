import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface RecordCardContextValue {
  state: {
    interactive: boolean
  }
}

interface RecordCardRootProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

interface RecordCardFieldProps {
  children: ReactNode
  label: string
}

const RecordCardContext = createContext<RecordCardContextValue | null>(null)

function useRecordCardContext() {
  const context = useContext(RecordCardContext)
  if (!context) throw new Error('RecordCard compound components must be used within RecordCard.Root')
  return context
}

function Root({ children, className, onClick }: RecordCardRootProps) {
  const interactive = Boolean(onClick)
  const classes = cn(
    'w-full rounded-xl border border-border-secondary bg-background-primary p-4 text-left transition-colors',
    interactive ? 'hover:border-border-brand' : '',
    interactive ? 'cursor-pointer' : '',
    className,
  )

  return (
    <RecordCardContext.Provider value={{ state: { interactive } }}>
      {interactive ? (
        <button className={classes} onClick={onClick} type="button">
          {children}
        </button>
      ) : (
        <div className={classes}>
          {children}
        </div>
      )}
    </RecordCardContext.Provider>
  )
}

function Header({ children }: { children: ReactNode }) {
  useRecordCardContext()
  return (
    <div className="flex items-start justify-between gap-3">
      {children}
    </div>
  )
}

function Heading({ children }: { children: ReactNode }) {
  useRecordCardContext()
  return <div className="min-w-0">{children}</div>
}

function Title({ children }: { children: ReactNode }) {
  useRecordCardContext()
  return <p className="text-base font-semibold text-text-primary">{children}</p>
}

function Subtitle({ children }: { children: ReactNode }) {
  useRecordCardContext()
  return <p className="mt-1 text-sm text-text-tertiary">{children}</p>
}

function Badges({ children }: { children: ReactNode }) {
  useRecordCardContext()
  return <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
}

function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  useRecordCardContext()
  return <dl className={cn('mt-4 grid grid-cols-2 gap-3 text-sm text-text-secondary', className)}>{children}</dl>
}

function Field({ children, label }: RecordCardFieldProps) {
  useRecordCardContext()
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.16em] text-text-quaternary">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function Actions({ children }: { children: ReactNode }) {
  const { state: { interactive } } = useRecordCardContext()
  return <div className={cn('mt-4 flex items-center justify-end gap-2', interactive ? 'pointer-events-none' : '')}>{children}</div>
}

export const RecordCard = { Root, Header, Heading, Title, Subtitle, Badges, FieldGrid, Field, Actions }
