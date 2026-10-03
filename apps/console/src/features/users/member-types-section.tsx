import { Section } from '@moc/ui/components/display/section'
import { Button } from '@moc/ui/components/controls/button'
import { Badge } from '@moc/ui/components/display/badge'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { FormField } from '@moc/ui/components/form/form-field'
import { Input } from '@moc/ui/components/form/input'
import { Label } from '@moc/ui/components/display/text'
import { Modal } from '@moc/ui/components/overlays/modal'
import type { MemberType } from '@moc/notifications'
import { useUsers } from './users-provider'

export function MemberTypesSection() {
  const {state:{memberTypes:state},actions:{memberTypes:actions},meta:{memberTypes:meta}}=useUsers()
  function renderType(type:MemberType) {
    return <ListItemCard.Root key={type.id}><ListItemCard.Content><ListItemCard.Title>{type.name}</ListItemCard.Title></ListItemCard.Content><ListItemCard.Trailing>{type.is_default?<Badge label="Default" color="gray"/>:null}<Button value={type.id} variant="secondary" onClick={actions.openRename}>Rename</Button></ListItemCard.Trailing></ListItemCard.Root>
  }
  if(!meta.canEdit) return null
  return <Section>
    <Section.Header title="Member types"/>
    <Section.Body className="gap-3"><DividedList>{state.types.map(renderType)}</DividedList><Button className="self-start" onClick={actions.openCreate}>Add member type</Button></Section.Body>
    <Modal open={state.draft!==null} onOpenChange={actions.changeOpen}><Modal.Portal><Modal.Backdrop/><Modal.Positioner><Modal.FullScreenPanel className="md:max-w-md">
      <Modal.Header><Label.md>{state.draft?.id?'Rename member type':'Add member type'}</Label.md></Modal.Header>
      <Modal.Content><div className="p-4"><FormField label="Member type name"><Input aria-label="Member type name" value={state.draft?.name??''} maxLength={80} onChange={actions.changeName}/></FormField></div></Modal.Content>
      <Modal.Footer><Modal.Close><Button variant="secondary" disabled={state.saving}>Cancel</Button></Modal.Close><Button onClick={actions.save} disabled={state.saving || !state.draft?.name.trim()}>Save</Button></Modal.Footer>
    </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal></Modal>
  </Section>
}
