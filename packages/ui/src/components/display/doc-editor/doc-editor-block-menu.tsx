import { Menu } from '@base-ui/react/menu'
import { ArrowDownToLine, ArrowUpToLine, Copy, Trash2 } from 'lucide-react'
import { cn } from '@moc/utils/cn'
import { useOverlayStack } from '@moc/ui/components/overlays/overlay-provider'
import type { ReactNode } from 'react'

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

function DocEditorBlockMenuItem({ item, onAction }: { item: DocEditorMenuItem; onAction: (action: string) => void }) {
    function handleClick() {
        onAction(item.id)
    }

    return (
        <Menu.Item
            className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none data-[highlighted]:bg-secondary',
                item.danger ? 'text-error' : 'text-secondary',
            )}
            onClick={handleClick}
        >
            {item.icon}
            {item.label}
        </Menu.Item>
    )
}

export function DocEditorBlockMenu({ anchorElement, onAction, onClose }: DocEditorBlockMenuProps) {
    const { state: overlayState } = useOverlayStack()

    function handleOpenChange(open: boolean) {
        if (!open) onClose()
    }

    return (
        <Menu.Root open onOpenChange={handleOpenChange}>
            <Menu.Portal container={overlayState.rootElement ?? undefined}>
                <Menu.Positioner anchor={anchorElement} side="bottom" align="center" sideOffset={6} className="z-[9050] outline-none">
                    <Menu.Popup className="pointer-events-auto flex min-w-48 flex-col overflow-x-hidden overflow-y-auto rounded-md border border-secondary bg-primary p-1 shadow-lg outline-none">
                        {menuItems.map((item) => item.id === 'separator'
                            ? <Menu.Separator key={item.id} className="my-1 h-px bg-secondary" />
                            : <DocEditorBlockMenuItem key={item.id} item={item} onAction={onAction} />)}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}
