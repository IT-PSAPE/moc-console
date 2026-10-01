import { Copy, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from './button'
import { Dropdown } from '../overlays/dropdown'

type ItemActionsMenuProps = {
    label: string
    disabled?: boolean
    onEdit: () => void
    onDuplicate: () => void
    onDelete: () => void
}

export function ItemActionsMenu({ label, disabled, onEdit, onDuplicate, onDelete }: ItemActionsMenuProps) {
    return (
        <Dropdown placement="bottom-end">
            <Dropdown.Trigger><Button.Icon aria-label={`Options for ${label}`} variant="ghost" icon={<EllipsisVertical />} disabled={disabled} /></Dropdown.Trigger>
            <Dropdown.Panel>
                <Dropdown.Item onSelect={onEdit}><Pencil className="size-4" aria-hidden="true" />Edit</Dropdown.Item>
                <Dropdown.Item onSelect={onDuplicate}><Copy className="size-4" aria-hidden="true" />Duplicate</Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item onSelect={onDelete}><Trash2 className="size-4 text-error" aria-hidden="true" /><span className="text-error">Delete</span></Dropdown.Item>
            </Dropdown.Panel>
        </Dropdown>
    )
}
