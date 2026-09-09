import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '@moc/utils/cn'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'

type InteractiveSurfaceProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode
}

function InteractiveSurfaceRoot({ children, className, type = 'button', ...props }: InteractiveSurfaceProps) {
    return (
        <BaseButton
            type={type}
            className={cn('touch-manipulation text-left focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none', className)}
            {...props}
        >
            {children}
        </BaseButton>
    )
}

type InteractiveSurfaceLinkProps = Omit<InteractiveSurfaceProps, 'type'> & {
    render: ReactElement
}

function InteractiveSurfaceLink({ children, className, render, ...props }: InteractiveSurfaceLinkProps) {
    return (
        <BaseButton
            nativeButton={false}
            render={render}
            className={cn('touch-manipulation text-left focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none', className)}
            {...props}
        >
            {children}
        </BaseButton>
    )
}

const cardClassName = 'w-full rounded-lg border border-secondary bg-primary shadow-xs transition-colors hover:bg-primary_hover active:bg-primary_hover'

function InteractiveSurfaceCard({ className, ...props }: InteractiveSurfaceProps) {
    return <InteractiveSurfaceRoot className={cn(cardClassName, className)} {...props} />
}

function InteractiveSurfaceCardLink({ className, ...props }: InteractiveSurfaceLinkProps) {
    return <InteractiveSurfaceLink className={cn(cardClassName, className)} {...props} />
}

export const InteractiveSurface = Object.assign(InteractiveSurfaceRoot, {
    Card: InteractiveSurfaceCard,
    CardLink: InteractiveSurfaceCardLink,
    Link: InteractiveSurfaceLink,
})
