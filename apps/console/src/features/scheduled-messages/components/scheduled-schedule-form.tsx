import { Link } from 'react-router-dom'
import { ChevronDown, MessageSquare, Search } from 'lucide-react'
import { Section } from '@moc/ui/components/display/section'
import { Card } from '@moc/ui/components/display/card'
import { Badge } from '@moc/ui/components/display/badge'
import { Accordion } from '@moc/ui/components/display/accordion'
import { Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { SelectField } from '@moc/ui/components/form/select-field'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { VariableTextEditor } from '@moc/ui/components/form/variable-text-editor'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Page } from '@moc/ui/components/layout/page'
import { Alert } from '@moc/ui/components/feedback/alert'
import type { ScheduledFieldDefinition } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'
import { ScheduledMessageField } from './scheduled-message-field'
import { ScheduledAttendanceGroupFields } from './scheduled-attendance-group-fields'
import { ScheduledTelegramPreview } from './scheduled-telegram-preview'

export function ScheduledScheduleForm() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function renderField(field: ScheduledFieldDefinition) {
        return <ScheduledMessageField key={field.key} field={field} labelPrefix="Message" value={state.schedule.fields[field.key] ?? ''} disabled={state.busy} onChange={actions.changeScheduleField} />
    }
    function renderMember(member: (typeof meta.members)[number]) {
        if (!member.matchesSearch) return null
        return <ListItemCard.Root key={member.id} className="min-h-control flex-nowrap gap-3 py-0 hover:bg-secondary">
            <Checkbox className="w-full flex-1 items-center *:even:mt-0" disabled={state.busy} value={member.id} checked={member.selected} onChange={actions.changeScheduleAttendee}>{member.name}</Checkbox>
            {member.position ? <Badge label={String(member.position)} color="blue" className="size-6 justify-center px-0 tabular-nums" /> : null}
        </ListItemCard.Root>
    }
    if (state.isInitialLoading) return <Page.Loading />
    if (state.loadError) return <Alert variant="error" title="Couldn't load message setup" description={state.loadError} action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} />
    return <>
        <FormField label="Message type"><SelectField name="message-type" label="Message type" items={meta.typeItems} value={state.schedule.messageType} onValueChange={actions.changeScheduleType} /></FormField>
        <>
            <Section><Section.Header size="sm" title="Message" /><Section.Body className="gap-4">{meta.scheduleFields.map(renderField)}
                <VariableTextEditor.Root source={state.schedule.body} html={meta.scheduleBodyEditor.editorHtml} variables={meta.variables} disabled={state.busy} textareaRef={meta.scheduleBodyMeta.textareaRef} onSourceChange={actions.changeBody} onRichChange={actions.changeRichBody} onInsertVariable={actions.insertTokenFromButton} richFallback={meta.scheduleBodyEditor.unsupportedTags.length ? <Paragraph.sm>Edit advanced blocks in Source to preserve their formatting.</Paragraph.sm> : null}>
                    <VariableTextEditor.Toolbar className="justify-between"><VariableTextEditor.ViewSwitch><SegmentedControl.Item value="preview">Preview</SegmentedControl.Item></VariableTextEditor.ViewSwitch><VariableTextEditor.Formatting /></VariableTextEditor.Toolbar><VariableTextEditor.Rich /><VariableTextEditor.Source />
                    <VariableTextEditor.Preview role="region" aria-label="Message preview" className="bg-[#e3ebdf] p-5 shadow-none dark:bg-[#0e1621] portrait:p-4">
                        {meta.previewError ? <Alert variant="error" title="Check message values" description={meta.previewError} /> : <ScheduledTelegramPreview preview={meta.preview} sendTime={meta.previewSendTime} />}
                    </VariableTextEditor.Preview>
                </VariableTextEditor.Root>
            </Section.Body></Section>
            {meta.isAttendance ? <Section>
                <Section.Header size="sm" title={meta.selectedAttendeeCount ? `Attendees · ${meta.selectedAttendeeCount} selected` : 'Attendees'} description="Attendees appear in the message in the order you select them." />
                <Section.Body className="gap-4">
                    <div className="flex flex-col gap-2">
                        <Input aria-label="Search attendees" icon={<Search />} value={meta.memberSearch} onChange={actions.changeMemberSearch} placeholder="Search members" />
                        <Card className="max-h-72 overflow-y-auto divide-y divide-border-secondary">
                            {meta.members.map(renderMember)}
                            {!meta.hasMatchingMembers ? <Paragraph.sm className="px-4 py-3 text-tertiary">No members found.</Paragraph.sm> : null}
                        </Card>
                    </div>
                    <Checkbox checked={state.schedule.requireArrival} disabled={state.busy} onChange={actions.changeScheduleArrival}>Ask attendees for their arrival time</Checkbox>
                    <ScheduledAttendanceGroupFields groups={state.schedule.attendanceGroups} disabled={state.busy} onChange={actions.changeScheduleGroup} onAdd={actions.addScheduleGroup} onEnable={actions.enableScheduleGroups} onClear={actions.clearScheduleGroups} onRemove={actions.removeScheduleGroup} />
                </Section.Body>
            </Section> : null}
            {!meta.groupItems.length ? <EmptyState icon={<MessageSquare />} title="No linked Telegram groups" description="Link the bot to a group before scheduling a message." action={<Button.Link variant="secondary" render={<Link to={`/${routes.settings}?tab=notifications`} />}>Telegram settings</Button.Link>} /> : <>
                <Section><Section.Header size="sm" title="Where to send" /><Section.Body className="gap-4"><FormField label="Telegram group"><SelectField name="group" label="Telegram group" items={meta.groupItems} value={state.schedule.groupChatId} onValueChange={actions.setGroup} /></FormField>{meta.hasTopics ? <FormField label="Topic"><SelectField name="topic" label="Topic" items={meta.topicItems} value={state.schedule.threadId || 'main'} onValueChange={actions.setTopic} /></FormField> : null}</Section.Body></Section>
                <Section><Section.Header size="sm" title="When to send" /><Section.Body className="gap-4">
                    <div className="grid grid-cols-2 gap-4 @max-[36rem]:grid-cols-1"><DateTimeFields label="Send date and time" name="startsOn" value={state.schedule.startsOn} onChange={actions.setStartsOn} required /><FormField label="Repeat"><SelectField name="repeat" label="Repeat" items={meta.frequencyItems} value={state.schedule.frequency} onValueChange={actions.setFrequency} /></FormField>{meta.isRecurring ? <FormField label="Last recurring date" optional><Input type="date" name="untilOn" aria-label="Last recurring date" value={state.schedule.untilOn} onChange={actions.changeSchedule} /></FormField> : null}</div>
                    <Checkbox checked={state.schedule.autoSend} onChange={actions.changeAutoSend}>Send automatically</Checkbox><Paragraph.xs className="text-tertiary">The free plan checks hourly, with delivery potentially nearly two hours late. Short expiry windows may close before delivery; use Send now when timing is critical.</Paragraph.xs>
                    <DateTimeFields label="Message expiry" name="expiresAt" value={state.schedule.expiresAt} onChange={actions.setExpiresAt} required helperText="The date and time variables display this value. Responses close at expiry." />
                    {meta.isRecurring ? <Paragraph.xs className="text-tertiary">Each occurrence keeps the interval between send and expiry, so its date and time advance automatically.</Paragraph.xs> : null}
                    <Accordion><Accordion.Item value="lifecycle"><Accordion.Trigger className="flex items-center justify-between py-2 text-secondary">Timezone<ChevronDown className="size-4 group-data-[panel-open]:rotate-180" /></Accordion.Trigger><Accordion.Content className="pt-3"><FormField label="Timezone"><Input name="timezone" aria-label="Timezone" value={state.schedule.timezone} onChange={actions.changeSchedule} /></FormField></Accordion.Content></Accordion.Item></Accordion>
                </Section.Body></Section>
            </>}
            {state.error ? <Alert variant="error" title="Couldn't schedule message" description={state.error} /> : null}
        </>
    </>
}
