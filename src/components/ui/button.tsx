import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  icon?: ReactNode
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-background-brand_solid text-static-white hover:bg-background-brand_solid-hover',
  secondary: 'bg-background-secondary text-text-secondary hover:bg-background-secondary_hover border border-border-primary',
  ghost: 'text-text-tertiary hover:text-text-secondary hover:bg-background-secondary_hover',
  danger: 'bg-background-error_primary text-foreground-error_primary hover:bg-background-error_secondary border border-border-error_subtle',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export function Button({ variant = 'primary', size = 'md', children, icon, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
