import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Section } from '@moc/ui/components/display/section'
import { Page } from '@moc/ui/components/layout/page'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { SelectField } from '@moc/ui/components/form/select-field'
import { VariableTextEditor } from '@moc/ui/components/form/variable-text-editor'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { Badge } from '@moc/ui/components/display/badge'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Alert } from '@moc/ui/components/feedback/alert'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import type { MemberType, ScheduledFieldDefinition } from '@moc/notifications'
import { UnsavedChangesModal } from '@/features/requests/unsaved-changes-modal'
import { routes } from '@/screens/console-routes'
import { useScheduledTemplateContext } from '../scheduled-template-context'
import { ScheduledMessageField } from './scheduled-message-field'
import { ScheduledAttendanceGroupFields } from './scheduled-attendance-group-fields'
import { ScheduledTelegramPreview } from './scheduled-telegram-preview'

export function ScheduledTemplateForm() {
    const { state, actions, meta } = useScheduledTemplateContext()
    if (state.isInitialLoading) return <Page.Loading />

    function renderField(field: ScheduledFieldDefinition) {
        return <ScheduledMessageField key={field.key} field={field} labelPrefix="Default" value={state.draft.fields[field.key] ?? ''} disabled={state.busy} onChange={actions.changeField} />
    }
    function renderAudience(type: MemberType) {
        return <Checkbox disabled={state.busy} key={type.id} value={type.id} checked={state.draft.audience.includes(type.id)} onChange={actions.changeAudience}>{type.name}{type.is_default ? <Badge label="Default" color="gray" /> : null}</Checkbox>
    }
    return <>
        <SplitPanel.Header>
            <SplitPanel.Close aria-label="Close template" />
            <Label.md className="min-w-0 flex-1 truncate">{state.draft.id ? state.draft.name : 'New template'}</Label.md>
        </SplitPanel.Header>
        <SplitPanel.Content className="@container">
            {state.missing ? <EmptyState icon={<FileText />} title="Template not found" description="Return to Messages and select another template." /> : <>
                <div className="grid grid-cols-2 gap-4 @max-[36rem]:grid-cols-1">
                    <FormField label="Template name"><Input disabled={state.busy} aria-label="Template name" value={state.draft.name} maxLength={80} onChange={actions.changeName} /></FormField>
                    <FormField label="Message type"><SelectField disabled={state.busy} name="message-type" label="Message type" value={state.draft.messageType} items={meta.typeItems} onValueChange={actions.changeType} /></FormField>
                </div>
                <VariableTextEditor.Root source={state.draft.body} html={state.editorHtml} variables={meta.variables} disabled={state.busy} textareaRef={meta.textareaRef} onSourceChange={actions.changeBody} onRichChange={actions.changeRichBody} onInsertVariable={actions.insertTokenFromButton} richFallback={state.unsupportedTags.length ? <Paragraph.sm>Edit advanced blocks in Source to preserve their formatting.</Paragraph.sm> : null}>
                    <VariableTextEditor.Toolbar className="justify-between"><VariableTextEditor.ViewSwitch><SegmentedControl.Item value="preview">Preview</SegmentedControl.Item></VariableTextEditor.ViewSwitch><VariableTextEditor.Formatting /></VariableTextEditor.Toolbar>
                    <VariableTextEditor.Rich /><VariableTextEditor.Source />
                    <VariableTextEditor.Preview role="region" aria-label="Message preview" className="bg-[#e3ebdf] p-5 shadow-none dark:bg-[#0e1621] portrait:p-4">
                        <Paragraph.xs className="mb-3 text-tertiary">Date and time display the message expiry. This template preview uses an example expiry.</Paragraph.xs>
                        {meta.preview.error ? <Alert variant="error" title="Couldn't preview message" description={meta.preview.error} /> : <ScheduledTelegramPreview preview={meta.preview} sendTime={meta.previewSendTime} />}
                        {meta.isAttendance && !meta.preview.attendeeCount ? <Paragraph.sm className="text-tertiary">No members with Telegram connected match the selected member types.</Paragraph.sm> : null}
                    </VariableTextEditor.Preview>
                </VariableTextEditor.Root>
                <Section><Section.Header size="sm" title="Default values" description="These prefill the message when you use this template." /><Section.Body className="gap-4">{meta.fields.map(renderField)}</Section.Body></Section>
                {meta.isAttendance ? <Section><Section.Header size="sm" title="Attendance" /><Section.Body className="gap-4"><FormField label="Who should respond?">{meta.memberTypes.map(renderAudience)}<Paragraph.xs className="text-tertiary">Only members with Telegram connected are included.</Paragraph.xs></FormField><Checkbox disabled={state.busy} checked={state.draft.requireArrival} onChange={actions.changeArrival}>Ask attendees for their arrival time</Checkbox><ScheduledAttendanceGroupFields groups={state.draft.attendanceGroups} disabled={state.busy} onChange={actions.changeAttendanceGroup} onAdd={actions.addAttendanceGroup} onEnable={actions.enableAttendanceGroups} onClear={actions.clearAttendanceGroups} onRemove={actions.removeAttendanceGroup} /></Section.Body></Section> : null}
                {state.error ? <Alert variant="error" title="Couldn't save template" description={state.error} /> : null}
            </>}
        </SplitPanel.Content>
        <SplitPanel.Footer>
            <Button.Link disabled={state.busy} variant="secondary" render={<Link to={`/${routes.scheduledMessages}`} />}>Cancel</Button.Link>
            <Button onClick={actions.saveAndBack} disabled={state.busy || !state.draft.name.trim() || !state.draft.fields.title?.trim()}>{state.busy ? 'Saving…' : 'Save template'}</Button>
        </SplitPanel.Footer>
        <UnsavedChangesModal open={state.navigationBlocked} onSave={actions.saveAndContinue} onDiscard={actions.discardAndContinue} onCancel={actions.cancel} isSaving={state.busy} message="Save this template before leaving, or discard your changes." />
    </>
}
