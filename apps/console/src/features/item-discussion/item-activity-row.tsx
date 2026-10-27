import { Accordion } from '@moc/ui/components/display/accordion'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { Section } from '@moc/ui/components/display/section'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Timeline } from '@moc/ui/components/display/timeline'
import { ArrowRight, ChevronDown } from 'lucide-react'
import type { ActivityChangeView, ActivityLinkView, ActivityView } from './discussion-types'
import { DiscussionActorAvatar } from './discussion-actor-avatar'
import { Link } from 'react-router-dom'

export function ItemActivityRow({ activity }: { activity: ActivityView }) {
    function renderLink(link: ActivityLinkView) {
        return <InteractiveSurface.Link key={link.href} render={<Link to={link.href} />} className="max-w-full break-words paragraph-sm font-medium text-primary underline decoration-border-secondary underline-offset-4 hover:decoration-current [overflow-wrap:anywhere]">{link.label}</InteractiveSurface.Link>
    }
    function renderChange(change: ActivityChangeView, index: number) {
        return (
            <Section.Body key={`${change.field}:${index}`} className="gap-1">
                <Label.xs className="text-tertiary">{change.field}</Label.xs>
                <Paragraph.sm className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 whitespace-pre-wrap break-words text-secondary">
                    <Label.sm className="min-w-0 font-normal [overflow-wrap:anywhere]">{change.before}</Label.sm>
                    <ArrowRight aria-hidden="true" className="size-3 shrink-0 self-center text-quaternary" />
                    <Label.xs className="sr-only">changed to</Label.xs>
                    <Label.sm className="min-w-0 font-normal text-primary [overflow-wrap:anywhere]">{change.after}</Label.sm>
                </Paragraph.sm>
            </Section.Body>
        )
    }

    const details = activity.changes.length || activity.description ? (
        <Section.Body className="gap-3 pt-1">
            {activity.changes.map(renderChange)}
            {activity.description && <Paragraph.sm className="whitespace-pre-wrap break-words text-secondary [overflow-wrap:anywhere]">{activity.description}</Paragraph.sm>}
        </Section.Body>
    ) : null

    return (
        <Timeline.Item>
            <Timeline.Marker className="overflow-hidden rounded-full bg-transparent">
                <DiscussionActorAvatar actor={activity.actor} />
            </Timeline.Marker>
            <Timeline.Content>
                <Paragraph.sm className="break-words text-secondary [overflow-wrap:anywhere]"><Label.sm className="text-primary">{activity.actor.name}</Label.sm>{' '}{activity.action}</Paragraph.sm>
                <Paragraph.xs className="text-tertiary" title={activity.time.exact}>{activity.time.relative}{activity.time.clock && ` · ${activity.time.clock}`}{activity.actor.source && ` · ${activity.actor.source}`}</Paragraph.xs>
                {Boolean(activity.links?.length) && <Section.Body className="items-start gap-1">{activity.links?.map(renderLink)}</Section.Body>}
                {activity.expandable ? (
                    <Accordion>
                        <Accordion.Item value={activity.id}>
                            <Accordion.Trigger className="mt-1 flex w-auto items-center gap-1 paragraph-xs text-tertiary hover:text-primary">
                                {activity.changesLabel}
                                <ChevronDown aria-hidden="true" className="size-3 transition-transform group-data-[panel-open]:rotate-180" />
                            </Accordion.Trigger>
                            <Accordion.Content className="pt-2">{details}</Accordion.Content>
                        </Accordion.Item>
                    </Accordion>
                ) : details}
            </Timeline.Content>
        </Timeline.Item>
    )
}
