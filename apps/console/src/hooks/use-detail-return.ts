import { useLocation } from 'react-router-dom'
import { resolveDetailReturn } from '@/lib/detail-return'

export function useDetailReturn(fallbackHref: string, fallbackLabel: string) {
    const { state } = useLocation()
    const href = resolveDetailReturn(state, fallbackHref)
    return { href, label: href === fallbackHref ? fallbackLabel : 'Back' }
}

export function useDetailLinkState(): { returnTo: string } {
    const { pathname, search } = useLocation()
    return { returnTo: `${pathname}${search}` }
}
