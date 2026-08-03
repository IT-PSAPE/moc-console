import { Drawer, useDrawer } from '@moc/ui/components/overlays/drawer'
import type { Checklist } from '@moc/types/checklists'
import { ChecklistPanelContent } from './checklist-drawer-content'

function ChecklistDrawerPanel({ checklist }: { checklist: Checklist }) {
    const { actions } = useDrawer()
    return <ChecklistPanelContent checklist={checklist} onClose={actions.close} />
}

export function ChecklistDrawer({ checklist }: { checklist: Checklist }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="max-w-lg">
                <ChecklistDrawerPanel checklist={checklist} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
