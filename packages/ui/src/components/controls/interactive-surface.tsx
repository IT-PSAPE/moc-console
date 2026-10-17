import { Button as BaseButton } from '@base-ui/react/button'
import { useContext } from 'react'
import { ListSurfaceContext } from '../display/list-surface-context'
import { cn } from '@moc/utils/cn'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'

type InteractiveSurfaceProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode
}

function InteractiveSurfaceRoot({ children, className, type = 'button', ...props }: InteractiveSurfaceProps) {
    return (
        <BaseButton
            type={type}
            className={cn('touch-manipulation text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand motion-reduce:transition-none', className)}
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
            role="link"
            render={render}
            className={cn('touch-manipulation text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand motion-reduce:transition-none', className)}
            {...props}
        >
            {children}
        </BaseButton>
    )
}

const rowClassName = 'w-full transition-colors hover:bg-secondary active:bg-secondary'

const cardClassName = 'w-full rounded-xl border border-secondary bg-primary shadow-xs transition-colors hover:bg-secondary active:bg-secondary'

function InteractiveSurfaceCard({ className, ...props }: InteractiveSurfaceProps) {
    const isListRow = useContext(ListSurfaceContext)
    return <InteractiveSurfaceRoot className={cn(isListRow ? rowClassName : cardClassName, className)} {...props} />
}

function InteractiveSurfaceCardLink({ className, ...props }: InteractiveSurfaceLinkProps) {
    const isListRow = useContext(ListSurfaceContext)
    return <InteractiveSurfaceLink className={cn(isListRow ? rowClassName : cardClassName, className)} {...props} />
}

export const InteractiveSurface = Object.assign(InteractiveSurfaceRoot, {
    Card: InteractiveSurfaceCard,
    CardLink: InteractiveSurfaceCardLink,
    Link: InteractiveSurfaceLink,
})
