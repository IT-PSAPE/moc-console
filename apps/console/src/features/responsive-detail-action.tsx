import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'

type ResponsiveDetailActionProps = {
    children: ReactNode
    className?: string
    mobileHref: string
    onActivate: MouseEventHandler<HTMLButtonElement>
}

function ResponsiveDetailActionRoot({ children, className, mobileHref, onActivate }: ResponsiveDetailActionProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <InteractiveSurface.Link render={<Link to={mobileHref} />} className={className}>
                {children}
            </InteractiveSurface.Link>
        )
    }

    return (
        <InteractiveSurface className={className} onClick={onActivate}>
            {children}
        </InteractiveSurface>
    )
}

function ResponsiveDetailCardAction({ children, className, mobileHref, onActivate }: ResponsiveDetailActionProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <InteractiveSurface.CardLink render={<Link to={mobileHref} />} className={className}>{children}</InteractiveSurface.CardLink>
    }

    return <InteractiveSurface.Card className={className} onClick={onActivate}>{children}</InteractiveSurface.Card>
}

export const ResponsiveDetailAction = Object.assign(ResponsiveDetailActionRoot, {
    Card: ResponsiveDetailCardAction,
})
