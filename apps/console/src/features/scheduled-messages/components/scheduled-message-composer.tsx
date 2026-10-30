import { Link } from 'react-router-dom'
import { MessageSquare, Search, Send } from 'lucide-react'
import { Section } from '@moc/ui/components/display/section'
import { Card } from '@moc/ui/components/display/card'
import { Badge } from '@moc/ui/components/display/badge'
import { Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { SelectField } from '@moc/ui/components/form/select-field'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Page } from '@moc/ui/components/layout/page'
import { Alert } from '@moc/ui/components/feedback/alert'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'
import { ScheduledAttendanceGroupFields } from './scheduled-attendance-group-fields'
import { ScheduledMessageBody } from './scheduled-message-body'

export function ScheduledMessageComposer() {
    const { state, actions, meta } = useScheduledMessagesContext()

    function renderMember(member: (typeof meta.members)[number]) {
        if (!member.matchesSearch) return null
        return <ListItemCard.Root key={member.id} className="min-h-control flex-nowrap gap-3 py-0 hover:bg-secondary">
            <Checkbox className="w-full flex-1 items-center *:even:mt-0" disabled={state.busy} value={member.id} checked={member.selected} onChange={actions.changeAttendee}>{member.name}</Checkbox>
            {member.position ? <Badge label={String(member.position)} color="blue" className="size-6 justify-center px-0 tabular-nums" /> : null}
        </ListItemCard.Root>
    }

    function renderAttendanceSettings() {
        if (!meta.isAttendance) return null
        return <Section>
            <Section.Header size="sm" title={meta.selectedAttendeeCount ? `Attendees · ${meta.selectedAttendeeCount} selected` : 'Attendees'} description="Attendees appear in the order you select them." />
            <Section.Body className="gap-4">
                <div className="flex flex-col gap-2">
                    <Input aria-label="Search attendees" icon={<Search />} value={state.draft.memberSearch} onChange={actions.changeMemberSearch} placeholder="Search members" />
                    <Card className="max-h-72 overflow-y-auto divide-y divide-border-secondary">
                        {meta.members.map(renderMember)}
                        {!meta.hasMatchingMembers ? <Paragraph.sm className="px-4 py-3 text-tertiary">No members found.</Paragraph.sm> : null}
                    </Card>
                </div>
                <ScheduledAttendanceGroupFields groups={state.draft.attendanceGroups} disabled={state.busy} onChange={actions.changeScheduleGroup} onAdd={actions.addScheduleGroup} onEnable={actions.enableScheduleGroups} onClear={actions.clearScheduleGroups} onRemove={actions.removeScheduleGroup} />
                <FormField label="Attendance follow-up">
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" name="followUpAmount" min={1} max={state.draft.followUpUnit === 'days' ? 365 : 8760} step={1} value={state.draft.followUpAmount} onChange={actions.changeDraft} aria-label="Follow-up delay" />
                        <SelectField name="follow-up-unit" label="Delay unit" items={meta.offsetUnitItems} value={state.draft.followUpUnit} onValueChange={actions.setFollowUpUnit} />
                    </div>
                    <Paragraph.xs className="text-tertiary">Scheduled from the primary message time. If the primary is delayed, the follow-up waits until it is sent.</Paragraph.xs>
                </FormField>
            </Section.Body>
        </Section>
    }

    function renderDestination() {
        if (!meta.destinationItems.length) return <EmptyState icon={<MessageSquare />} title="No linked Telegram groups" description="Link the bot to a group before sending a message." action={<Button.Link variant="secondary" render={<Link to={`/${routes.settings}?tab=notifications`} />}>Telegram settings</Button.Link>} />
        return <Section>
            <Section.Header size="sm" title="Where to send" />
            <Section.Body className="gap-4">
                <FormField label="Telegram group or topic"><SelectField name="destination" label="Telegram group or topic" placeholder="Choose a group or topic" items={meta.destinationItems} value={meta.destinationValue} onValueChange={actions.setDestination} disabled={state.busy} /></FormField>
            </Section.Body>
        </Section>
    }

    function renderDeliveryOptions() {
        return <Section>
            <Section.Header size="sm" title="When to send" />
            <Section.Body className="gap-4">
                <SegmentedControl value={state.draft.sendMode} onValueChange={actions.setDeliveryMode} fill>
                    <SegmentedControl.Item value="now" icon={<Send />}>Send now</SegmentedControl.Item>
                    <SegmentedControl.Item value="scheduled">Schedule</SegmentedControl.Item>
                </SegmentedControl>
                {state.draft.sendMode === 'scheduled' ? <>
                    <div className="flex flex-col gap-4">
                        <DateTimeFields label="Send date and time" name="startsOn" value={state.draft.startsOn} onChange={actions.setStartsOn} required />
                        <FormField label="Repeat"><SelectField name="repeat" label="Repeat" items={meta.frequencyItems} value={state.draft.frequency} onValueChange={actions.setFrequency} /></FormField>
                        {meta.isRecurring ? <FormField label="Last recurring date" optional><Input type="date" name="untilOn" aria-label="Last recurring date" value={state.draft.untilOn} onChange={actions.changeDraft} /></FormField> : null}
                    </div>
                </> : null}
            </Section.Body>
        </Section>
    }

    if (state.isInitialLoading) return <Page.Loading />
    if (state.loadError) return <EmptyState title="Message setup is unavailable" action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} />
    return <div className="flex flex-col gap-6">
        <FormField label="Message type"><SelectField name="message-type" label="Message type" items={meta.typeItems} value={state.draft.messageType} onValueChange={actions.changeDraftType} /></FormField>
        <Section>
            <Section.Header size="sm" title="Message" />
            <Section.Body>
                <ScheduledMessageBody.Root body={state.draft.body} onChange={actions.changeBody} primaryPreview={meta.primaryPreview} followUpPreview={meta.followUpPreview} timezone={meta.workspaceTimezone}>
                    <ScheduledMessageBody.Editor />
                </ScheduledMessageBody.Root>
            </Section.Body>
        </Section>
        {renderAttendanceSettings()}
        {renderDestination()}
        {renderDeliveryOptions()}
        {state.error ? <Alert variant="error" title="Check the message" description={state.error} /> : null}
    </div>
}
