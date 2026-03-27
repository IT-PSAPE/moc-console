import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface SelectionCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  title: string
  description?: string
  meta?: ReactNode
}

export function SelectionCard({ selected = false, title, description, meta, className = '', type = 'button', ...props }: SelectionCardProps) {
  return (
    <button
      type={type}
      className={`flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? 'border-border-brand bg-background-brand_primary' : 'border-border-secondary bg-background-primary hover:border-border-primary'} ${className}`}
      {...props}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-text-tertiary">{description}</p>
          )}
        </div>
        <span
          aria-hidden="true"
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${selected ? 'border-border-brand bg-background-brand_solid' : 'border-border-secondary bg-background-primary'}`}
        />
      </div>
      {meta && <div className="text-xs text-text-quaternary">{meta}</div>}
    </button>
  )
}
