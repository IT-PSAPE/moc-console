import { Button } from '@moc/ui/components/controls/button'
import { FormField } from '@moc/ui/components/form/form-field'
import { SelectField } from '@moc/ui/components/form/select-field'
import { TextArea } from '@moc/ui/components/form/text-area'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { Modal } from '@moc/ui/components/overlays/modal'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Alert } from '@moc/ui/components/feedback/alert'
import { useScheduledMessagesContext } from '../scheduled-messages-context'
import { ScheduledAttendanceGroupFields } from './scheduled-attendance-group-fields'

export function ScheduledOccurrenceEditor() {
  const {state,actions,meta}=useScheduledMessagesContext()
  return <>
    <Modal open={state.editing!==null} onOpenChange={actions.changeEditorOpen}>
      <Modal.Portal><Modal.Backdrop/><Modal.Positioner><Modal.FullScreenPanel className="md:max-w-lg">
        <Modal.Header><Label.md>Manage {state.editing?.fields.title}</Label.md></Modal.Header>
        <Modal.Content><div className="flex flex-col gap-4 p-4">
          <FormField label="Field"><SelectField name="edit-field" label="Field" items={meta.fieldItems} value={state.edit.field} onValueChange={actions.changeEditField}/></FormField>
          {state.edit.field==='attendanceGroups' ? <FormField label="Group choices"><ScheduledAttendanceGroupFields groups={meta.editGroups} disabled={state.busy} onChange={actions.changeAttendanceGroup} onAdd={actions.addAttendanceGroup} onEnable={actions.enableAttendanceGroups} onClear={actions.clearAttendanceGroups} onRemove={actions.removeAttendanceGroup}/></FormField> : <FormField label="Replacement value">{['sendOn','expiresAt'].includes(state.edit.field) ? <DateTimeFields ariaLabel="Replacement value" value={state.edit.value} onChange={actions.setEditTimestamp} required/> : <TextArea aria-label="Replacement value" value={state.edit.value} onChange={actions.changeEditValue}/>}</FormField>}
          {meta.showScope?<FormField label="Apply to"><SelectField name="edit-scope" label="Apply to" items={meta.scopeItems} value={state.edit.scope} onValueChange={actions.changeScope}/></FormField>:null}
          {state.error?<Alert variant="error" title="Couldn't apply change" description={state.error}/>:null}
        </div></Modal.Content>
        <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.busy}>Cancel</Button></Modal.Close><Button onClick={actions.requestEdit} disabled={state.busy}>Review change</Button></Modal.Footer>
      </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
    </Modal>
    {state.deleting ? <Modal open onOpenChange={actions.changeDeleteOpen}>
      <Modal.Portal><Modal.Backdrop/><Modal.Positioner><Modal.FullScreenPanel className="md:max-w-lg">
        <Modal.Header><Label.md>Delete {state.deleting?.fields.title}</Label.md></Modal.Header>
        <Modal.Content><div className="flex flex-col gap-4 p-4">
          <FormField label="Delete"><SelectField name="delete-scope" label="Delete scope" items={meta.scopeItems} value={state.deleteScope} onValueChange={actions.changeDeleteScope}/></FormField>
          <Paragraph.sm>Unsent messages will be cancelled. Sent messages will be removed from Telegram where possible, or marked deleted. Saved attendance responses will be kept.</Paragraph.sm>
        </div></Modal.Content>
        <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.busy}>Cancel</Button></Modal.Close><Button variant="danger" onClick={actions.reviewDelete} disabled={state.busy}>Review deletion</Button></Modal.Footer>
      </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
    </Modal> : null}
    <ConfirmationDialog open={state.confirmation!==null} title={state.confirmation?.title??'Confirm change'} description={state.confirmation?.description??''} errorText={state.error} confirmLabel={state.confirmation?.label??'Apply'} onConfirm={actions.confirm} onOpenChange={actions.changeConfirmationOpen} isConfirming={state.busy}/>
  </>
}
