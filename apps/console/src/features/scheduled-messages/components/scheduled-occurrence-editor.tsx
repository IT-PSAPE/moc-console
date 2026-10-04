import { Button } from '@moc/ui/components/controls/button'
import { FormField } from '@moc/ui/components/form/form-field'
import { SelectField } from '@moc/ui/components/form/select-field'
import { TextArea } from '@moc/ui/components/form/text-area'
import { Input } from '@moc/ui/components/form/input'
import { Modal } from '@moc/ui/components/overlays/modal'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { Label } from '@moc/ui/components/display/text'
import { Alert } from '@moc/ui/components/feedback/alert'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

export function ScheduledOccurrenceEditor() {
  const {state,actions,meta}=useScheduledMessagesContext()
  return <>
    <Modal open={state.editing!==null} onOpenChange={actions.changeEditorOpen}>
      <Modal.Portal><Modal.Backdrop/><Modal.Positioner><Modal.FullScreenPanel className="md:max-w-lg">
        <Modal.Header><Label.md>Manage {state.editing?.fields.title}</Label.md></Modal.Header>
        <Modal.Content><div className="flex flex-col gap-4 p-4">
          <FormField label="Field"><SelectField name="edit-field" label="Field" items={meta.fieldItems} value={state.edit.field} onValueChange={actions.changeEditField}/></FormField>
          <FormField label="Replacement value">{state.edit.field==='date' ? <Input type="date" aria-label="Replacement value" value={state.edit.value} onChange={actions.changeEditValue}/> : <TextArea aria-label="Replacement value" value={state.edit.value} onChange={actions.changeEditValue}/>}</FormField>
          {meta.showScope?<FormField label="Apply to"><SelectField name="edit-scope" label="Apply to" items={meta.scopeItems} value={state.edit.scope} onValueChange={actions.changeScope}/></FormField>:null}
          {state.error?<Alert variant="error" title="Couldn't apply change" description={state.error}/>:null}
        </div></Modal.Content>
        <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.busy}>Cancel</Button></Modal.Close><Button onClick={actions.requestEdit} disabled={state.busy}>Review change</Button></Modal.Footer>
      </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
    </Modal>
    <ConfirmationDialog open={state.confirmation!==null} title={state.confirmation?.title??'Confirm change'} description={state.confirmation?.description??''} errorText={state.error} confirmLabel={state.confirmation?.label??'Apply'} onConfirm={actions.confirm} onOpenChange={actions.changeConfirmationOpen} isConfirming={state.busy}/>
  </>
}
