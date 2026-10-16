import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { Venue } from "@moc/types/venues"
import { isManagedOptionNameAvailable, normalizeManagedOptionLabel } from "@moc/ui/components/form/use-managed-option-picker"
import { useManagedVenueOptions } from "@/features/venues/use-managed-venue-option-resource"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

type WorkspaceEditState = { workspaceId: string | null; editingId: string | null; editName: string; saving: boolean }
type WorkspaceTextState = { workspaceId: string | null; value: string }

export function useVenueCatalog() {
  const venues = useManagedVenueOptions()
  const { role, currentWorkspaceId } = useWorkspace()
  const currentWorkspaceRef = useRef(currentWorkspaceId)
  currentWorkspaceRef.current = currentWorkspaceId
  const { toast } = useFeedback()
  const [searchState, setSearchState] = useState<WorkspaceTextState>({ workspaceId: currentWorkspaceId, value: "" })
  const [newNameState, setNewNameState] = useState<WorkspaceTextState>({ workspaceId: currentWorkspaceId, value: "" })
  const [createState, setCreateState] = useState({ workspaceId: currentWorkspaceId, isOpen: false })
  if (createState.workspaceId !== currentWorkspaceId) setCreateState({ workspaceId: currentWorkspaceId, isOpen: false })
  const search = searchState.workspaceId === currentWorkspaceId ? searchState.value : ""
  const newName = newNameState.workspaceId === currentWorkspaceId ? newNameState.value : ""
  const [editState, setEditState] = useState<WorkspaceEditState>({ workspaceId: currentWorkspaceId, editingId: null, editName: "", saving: false })
  const currentEdit = editState.workspaceId === currentWorkspaceId ? editState : { workspaceId: currentWorkspaceId, editingId: null, editName: "", saving: false }
  const canCreate = role?.can_create === true
  const canUpdate = role?.can_update === true
  const visibleVenues = useMemo(() => venues.options.filter((venue) => venue.name.toLowerCase().includes(search.trim().toLowerCase())), [search, venues.options])

  function changeSearch(event: ChangeEvent<HTMLInputElement>) { setSearchState({ workspaceId: currentWorkspaceId, value: event.currentTarget.value }) }
  function changeNewName(event: ChangeEvent<HTMLInputElement>) { setNewNameState({ workspaceId: currentWorkspaceId, value: event.currentTarget.value }) }
  function openCreate() {
    if (!canCreate || currentEdit.saving) return
    setNewNameState({ workspaceId: currentWorkspaceId, value: "" })
    setCreateState({ workspaceId: currentWorkspaceId, isOpen: true })
  }
  function changeCreateOpen(open: boolean) {
    if (currentEdit.saving) return
    if (open) openCreate()
    else {
      setCreateState({ workspaceId: currentWorkspaceId, isOpen: false })
      setNewNameState({ workspaceId: currentWorkspaceId, value: "" })
    }
  }
  function closeCreate() { changeCreateOpen(false) }
  function beginEdit(venue: Venue) { setEditState({ ...currentEdit, editingId: venue.id, editName: venue.name }) }
  function changeEditName(event: ChangeEvent<HTMLInputElement>) { setEditState({ ...currentEdit, editName: event.currentTarget.value }) }
  function cancelEdit() { setEditState({ ...currentEdit, editingId: null, editName: "" }) }
  function handleNewNameKeyDown(event: KeyboardEvent<HTMLInputElement>) { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void create() } }
  function handleEditKeyDown(venue: Venue, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") { event.preventDefault(); void saveEdit(venue) }
    if (event.key === "Escape") { event.preventDefault(); cancelEdit() }
  }
  function nameAvailable(name: string, excludeId?: string) {
    return isManagedOptionNameAvailable(name, venues.options, (venue) => venue.name, (venue) => venue.id, excludeId)
  }
  function beginEditFor(venue: Venue) { return () => beginEdit(venue) }
  function editKeyDownFor(venue: Venue) { return (event: KeyboardEvent<HTMLInputElement>) => handleEditKeyDown(venue, event) }
  function saveEditFor(venue: Venue) { return () => void saveEdit(venue) }
  function changeActiveFor(venue: Venue) { return (active: boolean) => void changeActive(venue, active) }

  async function create() {
    const name = normalizeManagedOptionLabel(newName)
    if (!canCreate || !createState.isOpen || !nameAvailable(name) || currentEdit.saving) return
    const workspaceId = currentWorkspaceId
    setEditState({ ...currentEdit, saving: true })
    try {
      await venues.create(name)
      if (workspaceId === currentWorkspaceRef.current) {
        setNewNameState({ workspaceId, value: "" })
        setCreateState({ workspaceId, isOpen: false })
        toast({ title: "Venue added", variant: "success" })
      }
    } catch (error) {
      if (workspaceId === currentWorkspaceRef.current) toast({ title: "Could not add venue", description: error instanceof Error ? error.message : "Please try again.", variant: "error" })
    } finally {
      if (workspaceId === currentWorkspaceRef.current) setEditState((current) => ({ ...current, saving: false }))
    }
  }

  async function saveEdit(venue: Venue) {
    const name = normalizeManagedOptionLabel(currentEdit.editName)
    if (!canUpdate || !nameAvailable(name, venue.id) || currentEdit.saving || currentEdit.editingId !== venue.id) return
    const workspaceId = currentWorkspaceId
    setEditState({ ...currentEdit, saving: true })
    try {
      await venues.rename(venue, name)
      if (workspaceId === currentWorkspaceRef.current) { setEditState((current) => ({ ...current, editingId: null, editName: "", saving: false })); toast({ title: "Venue updated", variant: "success" }) }
    } catch (error) {
      if (workspaceId === currentWorkspaceRef.current) { setEditState((current) => ({ ...current, saving: false })); toast({ title: "Could not update venue", description: error instanceof Error ? error.message : "Please try again.", variant: "error" }) }
    }
  }

  async function changeActive(venue: Venue, active: boolean) {
    if (!canUpdate || currentEdit.saving) return
    const workspaceId = currentWorkspaceId
    setEditState({ ...currentEdit, saving: true })
    try {
      await venues.changeActive(venue, active)
      if (workspaceId === currentWorkspaceRef.current) toast({ title: active ? "Venue available" : "Venue marked unavailable", variant: "success" })
    } catch (error) {
      if (workspaceId === currentWorkspaceRef.current) toast({ title: "Could not update venue", description: error instanceof Error ? error.message : "Please try again.", variant: "error" })
    } finally {
      if (workspaceId === currentWorkspaceRef.current) setEditState((current) => ({ ...current, saving: false }))
    }
  }

  return { state: { search, newName, createOpen: createState.workspaceId === currentWorkspaceId && createState.isOpen, editingId: currentEdit.editingId, editName: currentEdit.editName, saving: currentEdit.saving, visibleVenues }, actions: { changeSearch, changeNewName, openCreate, changeCreateOpen, closeCreate, beginEditFor, changeEditName, cancelEdit, saveEditFor, changeActiveFor, create, handleNewNameKeyDown, editKeyDownFor, retry: () => venues.load(true), nameAvailable }, meta: { canCreate, canUpdate, error: venues.error, isLoading: venues.isLoading, isInitialLoading: venues.isInitialLoading } }
}
