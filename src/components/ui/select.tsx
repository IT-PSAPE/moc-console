import type { ReactNode, SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm text-text-tertiary">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`h-10 w-full rounded-lg border border-border-primary bg-background-primary px-3 text-sm text-text-primary outline-none transition-colors focus:border-border-brand focus:ring-1 focus:ring-[--color-border-brand]/25 disabled:bg-background-disabled disabled:text-text-disable ${error ? 'border-border-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-text-error">{error}</p>}
    </div>
  )
}
