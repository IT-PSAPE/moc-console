import { Button } from '@moc/ui/components/controls/button'
import { FormField } from '@moc/ui/components/form/form-field'
import { Input } from '@moc/ui/components/form/input'
import { SelectField } from '@moc/ui/components/form/select-field'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { Modal } from '@moc/ui/components/overlays/modal'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Alert } from '@moc/ui/components/feedback/alert'
import { useScheduledMessagesContext } from '../scheduled-messages-context'
import { ScheduledAttendanceGroupFields } from './scheduled-attendance-group-fields'
import { ScheduledMessageBody } from './scheduled-message-body'

export function ScheduledOccurrenceEditor() {
    const { state, actions, meta } = useScheduledMessagesContext()
    const occurrence = state.editing
    if (state.isInitialLoading) return null

    function renderEditField() {
        if (!occurrence) return null
        if (state.edit.field === 'body' && meta.editPreview) return <ScheduledMessageBody.Root body={state.edit.value} onChange={actions.changeEditBody} primaryPreview={meta.editPreview} followUpPreview={null} timezone={meta.workspaceTimezone}>
            <ScheduledMessageBody.Editor />
        </ScheduledMessageBody.Root>
        if (state.edit.field === 'attendanceGroups') return <FormField label="Group choices"><ScheduledAttendanceGroupFields groups={meta.editGroups} disabled={state.busy} onChange={actions.setEditGroup} onAdd={actions.addEditGroup} onEnable={actions.enableEditGroups} onClear={actions.clearEditGroups} onRemove={actions.removeEditGroup} /></FormField>
        if (state.edit.field === 'sendOn') return <DateTimeFields ariaLabel="Send date and time" value={state.edit.value} onChange={actions.setEditTimestamp} required />
        if (state.edit.field === 'followUpMinutes') return <FormField label="Delay in minutes">
            <Input type="number" aria-label="Follow-up delay in minutes" min={1} max={525600} step={1} value={state.edit.value} onChange={actions.changeEditValue} />
            <Paragraph.xs className="text-tertiary">This enables a separate Attendance post, anchored to the primary send time. If that time has passed, it waits for the primary to be sent.</Paragraph.xs>
        </FormField>
        return null
    }

    return <>
        <Modal open={occurrence !== null} onOpenChange={actions.changeEditorOpen}>
            <Modal.Portal><Modal.Backdrop /><Modal.Positioner><Modal.FullScreenPanel className="max-w-xl landscape:!max-w-none">
                <Modal.Header><Label.md>Manage {meta.editingLabel}</Label.md></Modal.Header>
                <Modal.Content>
                    <FormField label="Change"><SelectField name="edit-field" label="Change" items={meta.editFieldItems} value={state.edit.field} onValueChange={actions.changeEditField} /></FormField>
                    <div className="mt-4">{renderEditField()}</div>
                    {meta.showScope ? <FormField label="Apply to"><SelectField name="edit-scope" label="Apply to" items={meta.scopeItems} value={state.edit.scope} onValueChange={actions.changeScope} /></FormField> : null}
                    {state.error ? <Alert variant="error" title="Couldn't apply change" description={state.error} /> : null}
                </Modal.Content>
                <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.busy}>Cancel</Button></Modal.Close><Button onClick={actions.requestEdit} disabled={state.busy}>Review change</Button></Modal.Footer>
            </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
        </Modal>
        {state.deleting ? <Modal open onOpenChange={actions.changeDeleteOpen}>
            <Modal.Portal><Modal.Backdrop /><Modal.Positioner><Modal.FullScreenPanel className="max-w-lg landscape:!max-w-none">
                <Modal.Header><Label.md>Delete {meta.deletingLabel || 'message'}</Label.md></Modal.Header>
                <Modal.Content>
                    <FormField label="Delete"><SelectField name="delete-scope" label="Delete scope" items={meta.scopeItems} value={state.deleteScope} onValueChange={actions.changeDeleteScope} /></FormField>
                    <Paragraph.sm>Scheduled sends will be cancelled and Telegram cleanup will be attempted. Existing responses and discussion remain in Console history.</Paragraph.sm>
                </Modal.Content>
                <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.busy}>Cancel</Button></Modal.Close><Button variant="danger" onClick={actions.reviewDelete} disabled={state.busy}>Review deletion</Button></Modal.Footer>
            </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
        </Modal> : null}
        <ConfirmationDialog open={state.confirmation !== null} title={state.confirmation?.title ?? 'Confirm change'} description={state.confirmation?.description ?? ''} errorText={state.error} confirmLabel={state.confirmation?.label ?? 'Apply'} onConfirm={actions.confirm} onOpenChange={actions.changeConfirmationOpen} isConfirming={state.busy} />
    </>
}
