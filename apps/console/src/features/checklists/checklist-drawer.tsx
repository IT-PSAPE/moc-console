import { Drawer } from '@moc/ui/components/overlays/drawer'
import type { Checklist } from '@moc/types/checklists'
import { ChecklistDrawerContent } from './checklist-drawer-content'

export function ChecklistDrawer({ checklist }: { checklist: Checklist }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="max-w-lg">
                <ChecklistDrawerContent checklist={checklist} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
