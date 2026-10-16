import type { MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'
import { useDetailLinkState } from '@/hooks/use-detail-return'

type ResponsiveDetailActionProps = {
    children: ReactNode
    className?: string
    mobileHref: string
    onActivate: MouseEventHandler<HTMLButtonElement>
}

function ResponsiveDetailActionRoot({ children, className, mobileHref, onActivate }: ResponsiveDetailActionProps) {
    const isLandscape = useIsLandscape()
    const linkState = useDetailLinkState()

    if (isLandscape) {
        return (
            <InteractiveSurface.Link render={<Link to={mobileHref} state={linkState} />} className={className}>
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
    const isLandscape = useIsLandscape()
    const linkState = useDetailLinkState()

    if (isLandscape) {
        return <InteractiveSurface.CardLink render={<Link to={mobileHref} state={linkState} />} className={className}>{children}</InteractiveSurface.CardLink>
    }

    return <InteractiveSurface.Card className={className} onClick={onActivate}>{children}</InteractiveSurface.Card>
}

export const ResponsiveDetailAction = Object.assign(ResponsiveDetailActionRoot, {
    Card: ResponsiveDetailCardAction,
})
