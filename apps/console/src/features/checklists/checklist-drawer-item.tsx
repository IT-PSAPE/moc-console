import { routes } from '@/screens/console-routes'
import { ResponsiveDrawerTrigger } from '@/features/responsive-drawer-trigger'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import type { Checklist } from '@moc/types/checklists'
import { ChecklistDrawer } from './checklist-drawer'
import { ChecklistItemContent } from './checklist-item-content'

export function ChecklistDrawerItem({ checklist }: { checklist: Checklist }) {
    return (
        <Drawer>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.checklists}/${checklist.id}`}>
                <ChecklistItemContent checklist={checklist} />
            </ResponsiveDrawerTrigger.Card>
            <ChecklistDrawer checklist={checklist} />
        </Drawer>
    )
}
