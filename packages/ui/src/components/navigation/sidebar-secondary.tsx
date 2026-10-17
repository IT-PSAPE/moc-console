import { useRef, type HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { ResizeHandle } from '../controls/resize-handle'
import { useSidebar } from './sidebar-context'
import { useIsLandscape } from '../../hooks/use-is-landscape'

/**
 * The secondary navigation column. On desktop its width is user-resizable via
 * the hairline handle on its right edge (persisted by SidebarProvider); the
 * handle is also the only divider between the sidebar and the content.
 */
export function SidebarSecondary({ className, style, ...props }: HTMLAttributes<HTMLElement>) {
    const { state, actions, meta } = useSidebar()
    const isLandscape = useIsLandscape()
    const isHidden = state.isCollapsed && !isLandscape
    const navRef = useRef<HTMLElement | null>(null)

    function resizeAt(clientX: number) {
        const left = navRef.current?.getBoundingClientRect().left ?? 0
        actions.setWidth(clientX - left)
    }

    function resizeBy(amount: number) {
        actions.setWidth(state.width + amount * (meta.maxWidth - meta.minWidth))
    }

    function resizeToBoundary(boundary: 'minimum' | 'maximum') {
        actions.setWidth(boundary === 'minimum' ? meta.minWidth : meta.maxWidth)
    }

    const percent = ((state.width - meta.minWidth) / (meta.maxWidth - meta.minWidth)) * 100

    return (
        <div className={cn('flex min-h-0 min-w-0 shrink-0 landscape:flex-1', state.isResizing && 'select-none')}>
            <nav
                ref={navRef}
                inert={isHidden}
                aria-hidden={isHidden || undefined}
                className={cn(
                    'flex min-h-0 min-w-0 flex-none flex-col overflow-hidden landscape:flex-1 motion-reduce:transition-none',
                    state.isResizing ? 'transition-none' : 'transition-[width,opacity] duration-200 landscape:transition-none',
                    state.isCollapsed ? 'w-0 opacity-0 landscape:w-auto landscape:opacity-100' : 'landscape:w-auto',
                    className,
                )}
                style={!state.isCollapsed && !isLandscape ? { width: state.width, ...style } : style}
                {...props}
            />
            {!isHidden && !isLandscape ? (
                <ResizeHandle
                    aria-label="Resize navigation"
                    isResizing={state.isResizing}
                    value={percent}
                    valueText={`${state.width}px`}
                    onReset={actions.resetWidth}
                    onResizeAt={resizeAt}
                    onResizeBy={resizeBy}
                    onResizeToBoundary={resizeToBoundary}
                    onResizingChange={actions.setResizing}
                />
            ) : null}
        </div>
    )
}
