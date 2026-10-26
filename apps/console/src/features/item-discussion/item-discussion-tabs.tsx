import { Section } from '@moc/ui/components/display/section'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { useItemDiscussionContext } from './item-discussion-context'
import { ItemActivityList } from './item-activity-list'
import { ItemComments } from './item-comments'

export function ItemDiscussionTabs() {
    const { state, actions, meta } = useItemDiscussionContext()
    if (!meta.canRead) return null
    return (
        <Section className="min-w-0 shrink-0" aria-label="Discussion">
            <Tabs value={state.tab} onValueChange={actions.changeTab}>
                <Tabs.List><Tabs.Tab value="activity">Activity</Tabs.Tab><Tabs.Tab value="comments">Comments</Tabs.Tab></Tabs.List>
                <Tabs.Panels>
                    <Tabs.Panel value="activity"><ItemActivityList /></Tabs.Panel>
                    <Tabs.Panel value="comments"><ItemComments /></Tabs.Panel>
                </Tabs.Panels>
            </Tabs>
        </Section>
    )
}
