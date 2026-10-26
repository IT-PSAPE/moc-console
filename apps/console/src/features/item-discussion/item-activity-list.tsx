import { Button } from '@moc/ui/components/controls/button'
import { Section } from '@moc/ui/components/display/section'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Timeline } from '@moc/ui/components/display/timeline'
import { RetryAlert } from '@moc/ui/components/feedback/retry-alert'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import type { ActivityGroupView, ActivityView } from './discussion-types'
import { useItemDiscussionContext } from './item-discussion-context'
import { ItemActivityRow } from './item-activity-row'

export function ItemActivityList() {
    const { state, actions } = useItemDiscussionContext()

    function renderGroup(group: ActivityGroupView) {
        return <Section key={group.key}><Label.xs className="mb-4 block text-tertiary">{group.label}</Label.xs><Timeline.Root>{group.items.map(renderActivity)}</Timeline.Root></Section>
    }

    function renderActivity(activity: ActivityView) { return <ItemActivityRow key={activity.id} activity={activity} /> }

    return (
        <ScrollArea className="max-h-[min(34rem,70dvh)]">
            <ScrollArea.Viewport className="max-h-[min(34rem,70dvh)]">
                <ScrollArea.Content>
                    <Section.Body className="gap-6 pr-2 pb-2">
                        {state.activityLoading && <LoadingSpinner className="py-8" />}
                        {state.activityError && <RetryAlert title="Couldn’t load activity" description={state.activityError} onRetry={actions.refreshActivity} isRetrying={state.activityFetching} />}
                        {state.activityGroups.map(renderGroup)}
                        {!state.activityLoading && !state.activityError && !state.activityGroups.length && <Paragraph.sm className="py-3 text-tertiary">No recorded changes.</Paragraph.sm>}
                        {state.hasMoreActivity && <Button variant="ghost" size="sm" className="self-start" onClick={actions.loadMoreActivity} disabled={state.activityFetching}>{state.activityFetching ? 'Loading…' : 'Load earlier activity'}</Button>}
                    </Section.Body>
                </ScrollArea.Content>
            </ScrollArea.Viewport>
        </ScrollArea>
    )
}
