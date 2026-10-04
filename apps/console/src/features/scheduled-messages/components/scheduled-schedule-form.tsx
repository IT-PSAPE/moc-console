import { Link } from 'react-router-dom'
import { ChevronDown, FileText, MessageSquare } from 'lucide-react'
import { Section } from '@moc/ui/components/display/section'
import { Accordion } from '@moc/ui/components/display/accordion'
import { Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { SelectField } from '@moc/ui/components/form/select-field'
import { RichTextEditor } from '@moc/ui/components/form/rich-text-editor'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Alert } from '@moc/ui/components/feedback/alert'
import type { ScheduledFieldDefinition } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'
import { ScheduledMessageField } from './scheduled-message-field'

export function ScheduledScheduleForm() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function renderField(field: ScheduledFieldDefinition) {
        return <ScheduledMessageField key={field.key} field={field} labelPrefix="Message" value={state.schedule.fields[field.key] ?? ''} disabled={state.busy} onChange={actions.changeScheduleField} />
    }
    if (state.loading) return <LoadingSpinner className="py-16" />
    if (state.loadError) return <Alert variant="error" title="Couldn't load message setup" description={state.loadError} action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} />
    if (!meta.templateItems.length) return <EmptyState icon={<FileText />} title="Start with a template" description="Create an announcement or pre-attendance template, then choose where and when to send it." action={<Button.Link render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create a template</Button.Link>} />
    return <>
        <FormField label="Template"><SelectField name="template" label="Template" items={meta.templateItems} value={state.schedule.templateId} onValueChange={actions.setTemplateId} /></FormField>
        <Button.Link variant="ghost" className="self-start -ml-3" render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create a new template</Button.Link>
        {meta.selectedTemplate ? <>
            <Section><Section.Header title="Message" /><Section.Body className="gap-4">{meta.scheduleFields.map(renderField)}
                <Accordion><Accordion.Item value="preview"><Accordion.Trigger className="flex items-center justify-between py-2 text-secondary">Preview message<ChevronDown className="size-4 group-data-[panel-open]:rotate-180" /></Accordion.Trigger><Accordion.Content className="pt-2">{meta.previewError ? <Alert variant="error" title="Check message values" description={meta.previewError} /> : <RichTextEditor.Root value={meta.previewHtml} onChange={actions.ignorePreviewChange} disabled><RichTextEditor.Content className="rounded-lg [&_.ProseMirror]:min-h-0" /></RichTextEditor.Root>}{meta.isAttendance ? <Paragraph.xs className="pt-2 text-tertiary">The attendee list is finalized and response buttons are added when this message is sent.</Paragraph.xs> : null}</Accordion.Content></Accordion.Item></Accordion>
            </Section.Body></Section>
            {!meta.groupItems.length ? <EmptyState icon={<MessageSquare />} title="No linked Telegram groups" description="Link the bot to a group before scheduling a message." action={<Button.Link variant="secondary" render={<Link to={`/${routes.settings}?tab=telegram`} />}>Telegram settings</Button.Link>} /> : <>
                <Section><Section.Header title="Where to send" /><Section.Body className="gap-4"><FormField label="Telegram group"><SelectField name="group" label="Telegram group" items={meta.groupItems} value={state.schedule.groupChatId} onValueChange={actions.setGroup} /></FormField>{meta.hasTopics ? <FormField label="Topic"><SelectField name="topic" label="Topic" items={meta.topicItems} value={state.schedule.threadId || 'main'} onValueChange={actions.setTopic} /></FormField> : null}</Section.Body></Section>
                <Section><Section.Header title="When to send" /><Section.Body className="gap-4">
                    <div className="grid gap-4 sm:grid-cols-2"><DateTimeFields label="Send date and time" name="startsOn" value={state.schedule.startsOn} onChange={actions.setStartsOn} required /><FormField label="Repeat"><SelectField name="repeat" label="Repeat" items={meta.frequencyItems} value={state.schedule.frequency} onValueChange={actions.setFrequency} /></FormField>{meta.isRecurring ? <FormField label="Last recurring date" optional><Input type="date" name="untilOn" aria-label="Last recurring date" value={state.schedule.untilOn} onChange={actions.changeSchedule} /></FormField> : null}</div>
                    <Checkbox checked={state.schedule.autoSend} onChange={actions.changeAutoSend}>Send automatically</Checkbox><Paragraph.xs className="text-tertiary">The free plan checks hourly, with delivery potentially nearly two hours late. Short expiry windows may close before delivery; use Send now when timing is critical.</Paragraph.xs>
                    <DateTimeFields label="Message expiry" name="expiresAt" value={state.schedule.expiresAt} onChange={actions.setExpiresAt} required helperText="The date and time variables display this value. Responses close at expiry." />
                    {meta.isRecurring ? <Paragraph.xs className="text-tertiary">Each occurrence keeps the interval between send and expiry, so its date and time advance automatically.</Paragraph.xs> : null}
                    <Accordion><Accordion.Item value="lifecycle"><Accordion.Trigger className="flex items-center justify-between py-2 text-secondary">Timezone<ChevronDown className="size-4 group-data-[panel-open]:rotate-180" /></Accordion.Trigger><Accordion.Content className="pt-3"><FormField label="Timezone"><Input name="timezone" aria-label="Timezone" value={state.schedule.timezone} onChange={actions.changeSchedule} /></FormField></Accordion.Content></Accordion.Item></Accordion>
                </Section.Body></Section>
                {state.error ? <Alert variant="error" title="Couldn't schedule message" description={state.error} /> : null}
                <div className="flex justify-end gap-2"><Button.Link variant="secondary" render={<Link to={`/${routes.scheduledMessages}`} />}>Cancel</Button.Link><Button disabled={state.busy || !state.schedule.groupChatId || !state.schedule.fields.title?.trim()} onClick={actions.requestSchedule}>Review schedule</Button></div>
            </>}
        </> : null}
    </>
}
