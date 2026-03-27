import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cv } from '../../utils/cv'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  icon?: ReactNode
}

const buttonStyles = cv({
  base: [
    'inline-flex items-center justify-center font-semibold transition-colors',
    'disabled:pointer-events-none',
  ],
  variants: {
    variant: {
      primary: [
        'bg-background-button_primary text-static-white hover:bg-background-button_primary_hover',
        'disabled:border disabled:border-border-disabled disabled:bg-background-disabled disabled:text-text-disable',
      ],
      secondary: [
        'border border-border-primary bg-background-secondary text-text-secondary hover:bg-background-secondary_hover',
        'disabled:border-border-disabled disabled:bg-background-disabled disabled:text-text-disable',
      ],
      ghost: [
        'bg-transparent text-text-secondary hover:bg-background-secondary hover:text-text-secondary',
        'disabled:bg-transparent disabled:text-text-disable',
      ],
      danger: [
        'border border-border-error bg-background-error_solid text-static-white hover:bg-background-error_solid-hover',
        'disabled:border-border-disabled disabled:bg-background-disabled disabled:text-text-disable',
      ],
    },
    size: {
      sm: ['rounded-[4px] gap-1.5 px-3 py-1.5 text-[12px] leading-[14.4px] tracking-[0px]'],
      md: ['rounded-[6px] gap-2 px-4 py-2 text-[14px] leading-[16.8px] tracking-[0.084px]'],
      lg: ['rounded-[6px] gap-2 px-6 py-3 text-[14px] leading-[16.8px] tracking-[0.084px]'],
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export function Button({ variant = 'primary', size = 'md', children, icon, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
