import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cv } from '@/utils/cv'

type Variant = 'ghost' | 'secondary' | 'danger'
type Size = 'sm' | 'md'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  variant?: Variant
  size?: Size
}

const iconButtonStyles = cv({
  base: [
    'inline-flex items-center justify-center transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  variants: {
    variant: {
      ghost: ['text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary'],
      secondary: ['border border-border-primary bg-background-primary text-text-secondary hover:bg-background-secondary_hover'],
      danger: ['text-foreground-error_primary hover:bg-background-error_primary hover:text-foreground-error_primary'],
    },
    size: {
      sm: ['h-8 w-8 rounded-lg'],
      md: ['h-9 w-9 rounded-lg'],
    },
  },
  defaultVariants: {
    variant: 'ghost',
    size: 'md',
  },
})

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className = '', ...props },
  ref,
) {
  return (
    <button
      aria-label={label}
      className={iconButtonStyles({ variant, size, className })}
      ref={ref}
      title={label}
      type={props.type ?? 'button'}
      {...props}
    >
      {icon}
    </button>
  )
})
