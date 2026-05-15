import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpToLine, Copy, Trash2 } from 'lucide-react'
import { cn } from '@moc/utils/cn'
import { useOverlayStack } from '@moc/ui/components/overlays/overlay-provider'
import { useAnchorPosition } from '@moc/ui/components/overlays/overlay-primitives'

type DocEditorBlockMenuProps = {
    anchorElement: HTMLElement | null
    onAction: (action: string) => void
    onClose: () => void
}

type DocEditorMenuItem = {
    id: string
    icon?: ReactNode
    label?: string
    danger?: boolean
}

const menuItems: DocEditorMenuItem[] = [
    { id: 'delete', icon: <Trash2 size={14} />, label: 'Delete block', danger: true },
    { id: 'duplicate', icon: <Copy size={14} />, label: 'Duplicate' },
    { id: 'separator' },
    { id: 'move-top', icon: <ArrowUpToLine size={14} />, label: 'Move to top' },
    { id: 'move-bottom', icon: <ArrowDownToLine size={14} />, label: 'Move to bottom' },
]

function isSeparator(item: DocEditorMenuItem) {
    return item.id === 'separator'
}

export function DocEditorBlockMenu({ anchorElement, onAction, onClose }: DocEditorBlockMenuProps) {
    const [menuElement, setMenuElement] = useState<HTMLDivElement | null>(null)
    const { state: overlayState, meta: overlayMeta } = useOverlayStack()
    const position = useAnchorPosition(anchorElement, menuElement, true, 'bottom', 6)

    const handleMenuRef = useCallback((node: HTMLDivElement | null) => {
        setMenuElement(node)
    }, [])

    useEffect(() => {
        function handleMouseDown(event: MouseEvent) {
            if (menuElement && !menuElement.contains(event.target as Node)) {
                onClose()
            }
        }

        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', handleMouseDown)
        }, 50)

        return () => {
            window.clearTimeout(timer)
            document.removeEventListener('mousedown', handleMouseDown)
        }
    }, [menuElement, onClose])

    function handleAction(action: string) {
        onAction(action)
    }

    function handleButtonMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
        event.preventDefault()
    }

    function renderMenuItem(item: DocEditorMenuItem) {
        if (isSeparator(item)) {
            return <div key={item.id} className="my-1 h-px bg-secondary" />
        }

        function handleClick() {
            handleAction(item.id)
        }

        return (
            <button
                key={item.id}
                type="button"
                className={cn(
                    'flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-secondary',
                    item.danger ? 'text-error' : 'text-secondary',
                )}
                onMouseDown={handleButtonMouseDown}
                onClick={handleClick}
            >
                {item.icon}
                {item.label}
            </button>
        )
    }

    const menuStyle: CSSProperties = {
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
        zIndex: overlayMeta.baseZIndex + 50,
        visibility: position.isPositioned ? 'visible' : 'hidden',
    }

    const menu = (
        <div
            ref={handleMenuRef}
            className="pointer-events-auto fixed z-50 flex min-w-48 flex-col overflow-x-hidden overflow-y-auto rounded-md border border-secondary bg-primary p-1 shadow-lg"
            style={menuStyle}
        >
            {menuItems.map(renderMenuItem)}
        </div>
    )

    if (!overlayState.rootElement) {
        return menu
    }

    return createPortal(menu, overlayState.rootElement)
}
