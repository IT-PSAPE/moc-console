import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { useIsLandscape } from '@moc/ui/hooks/use-is-landscape'

type ResponsiveDrawerTriggerProps = {
    children: ReactNode
    className?: string
    mobileHref: string
}

function ResponsiveDrawerTriggerRoot({ children, className, mobileHref }: ResponsiveDrawerTriggerProps) {
    const isLandscape = useIsLandscape()

    if (isLandscape) {
        return (
            <InteractiveSurface.Link render={<Link to={mobileHref} />} className={className}>
                {children}
            </InteractiveSurface.Link>
        )
    }

    return (
        <Drawer.Trigger>
            <InteractiveSurface className={className}>
                {children}
            </InteractiveSurface>
        </Drawer.Trigger>
    )
}

function ResponsiveDrawerCardTrigger({ children, className, mobileHref }: ResponsiveDrawerTriggerProps) {
    const isLandscape = useIsLandscape()

    if (isLandscape) {
        return <InteractiveSurface.CardLink render={<Link to={mobileHref} />} className={className}>{children}</InteractiveSurface.CardLink>
    }

    return <Drawer.Trigger><InteractiveSurface.Card className={className}>{children}</InteractiveSurface.Card></Drawer.Trigger>
}

export const ResponsiveDrawerTrigger = Object.assign(ResponsiveDrawerTriggerRoot, {
    Card: ResponsiveDrawerCardTrigger,
})
