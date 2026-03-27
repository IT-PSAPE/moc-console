import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function TextArea({ label, error, id, className = '', ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm text-text-tertiary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full rounded-lg border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-colors focus:border-border-brand focus:ring-1 focus:ring-[--color-border-brand]/25 disabled:bg-background-disabled disabled:text-text-disable ${error ? 'border-border-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-text-error">{error}</p>}
    </div>
  )
}
