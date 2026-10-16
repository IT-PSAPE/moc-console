import { Check, MapPin, Pencil, Plus, Search, X } from "lucide-react"
import type { Venue } from "@moc/types/venues"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Label } from "@moc/ui/components/display/text"
import { Modal } from "@moc/ui/components/overlays/modal"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Page } from "@moc/ui/components/layout/page"
import { Table } from "@moc/ui/components/display/table"
import { Badge } from "@moc/ui/components/display/badge"
import { Toggle } from "@moc/ui/components/form/toggle"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"
import { useVenueCatalog } from "@/features/venue-catalog/use-venue-catalog"

export function VenueCatalogPage() {
  const { state, actions, meta } = useVenueCatalog()
  if (meta.isInitialLoading) return <Page.Loading />

  function renderVenue(venue: Venue) {
    return <Table.Row key={venue.id}>
      <Table.Cell className="max-w-0 px-3 py-3 font-medium portrait:px-2 portrait:py-2"><span className="block truncate" title={venue.name}>{state.editingId === venue.id ? <Input aria-label={`Venue name for ${venue.name}`} value={state.editName} onChange={actions.changeEditName} autoFocus onKeyDown={actions.editKeyDownFor(venue)} /> : venue.name}</span></Table.Cell>
      <Table.Cell className="px-3 py-3 portrait:px-2 portrait:py-2">{meta.canUpdate ? <Toggle checked={venue.active} onChange={actions.changeActiveFor(venue)} disabled={state.saving} aria-label={`${venue.active ? "Mark" : "Make"} ${venue.name} ${venue.active ? "unavailable" : "available"}`} /> : <Badge color={venue.active ? "green" : "gray"} label={venue.active ? "Yes" : "No"} />}</Table.Cell>
      <Table.Cell className="px-3 py-2 text-right portrait:px-2">{meta.canUpdate ? state.editingId === venue.id ? <div className="flex justify-end gap-1"><Button.Icon aria-label="Save venue name" icon={<Check />} variant="ghost" disabled={!actions.nameAvailable(state.editName, venue.id) || state.saving} onClick={actions.saveEditFor(venue)} /><Button.Icon aria-label="Cancel venue rename" icon={<X />} variant="ghost" disabled={state.saving} onClick={actions.cancelEdit} /></div> : <Button.Icon aria-label={`Rename ${venue.name}`} icon={<Pencil />} variant="ghost" disabled={state.saving} onClick={actions.beginEditFor(venue)} /> : null}</Table.Cell>
    </Table.Row>
  }

  return <Page>
    <Page.Header>
      <Page.Heading><Page.Title>Venues</Page.Title></Page.Heading>
      <Page.Controls>
        <Input aria-label="Search venues" name="venue-catalog-search" autoComplete="off" icon={<Search />} placeholder="Search venues…" value={state.search} onChange={actions.changeSearch} />
        {meta.canCreate ? <Button.Icon aria-label="Add venue" variant="secondary" icon={<Plus />} onClick={actions.openCreate} /> : null}
      </Page.Controls>
    </Page.Header>
    <Page.Content>
      {meta.error ? <ResourceLoadError title="Couldn't load venues" error={meta.error} onRetry={actions.retry} /> : state.visibleVenues.length === 0 ? <EmptyState icon={<MapPin />} title={state.search ? "No venues match your search" : "No venues yet"} description={state.search ? "Try another venue name." : meta.canCreate ? "Add a venue to make it available for bookings." : "Venues added to this workspace will appear here."} /> : <Table className="w-full table-fixed"><Table.Head><Table.Row><Table.Header className="w-1/2 px-3 py-2 portrait:px-2">Name</Table.Header><Table.Header className="px-3 py-2 portrait:px-2">Available</Table.Header><Table.Header className="px-3 py-2 text-right portrait:px-2">Actions</Table.Header></Table.Row></Table.Head><Table.Body>{state.visibleVenues.map(renderVenue)}</Table.Body></Table>}
    </Page.Content>
    {meta.canCreate ? <Modal open={state.createOpen} onOpenChange={actions.changeCreateOpen} closeOnEscape={!state.saving} closeOnBackdropClick={!state.saving}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel>
            <Modal.Header><Label.md>Add venue</Label.md></Modal.Header>
            <Modal.Content>
              <div className="flex flex-col gap-1.5 p-4">
                <FormLabel label="Name" required />
                <Input aria-label="New venue name" name="new-venue-name" autoComplete="off" placeholder="Venue name" value={state.newName} onChange={actions.changeNewName} onKeyDown={actions.handleNewNameKeyDown} disabled={state.saving} />
              </div>
            </Modal.Content>
            <Modal.Footer>
              <Button variant="secondary" onClick={actions.closeCreate} disabled={state.saving}>Cancel</Button>
              <Button onClick={actions.create} disabled={!actions.nameAvailable(state.newName) || state.saving}>{state.saving ? "Adding…" : "Add venue"}</Button>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal> : null}
  </Page>
}
