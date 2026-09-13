import { useCallback, useEffect, useState } from "react"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { VenueEvent } from "@moc/types/venues"
import { fetchVenueEvents } from "@/data/fetch-venue-events"
import { createVenueEvent, deleteVenueEvent, setVenueEventActive, updateVenueEvent, type VenueEventDraft } from "@/data/mutate-venue-events"
import { useWorkspace } from "@/lib/workspace-context"

export type VenueEventFormTarget = { mode: "create" } | { mode: "edit"; event: VenueEvent }

export function useVenueEventsSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [events, setEvents] = useState<VenueEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [formTarget, setFormTarget] = useState<VenueEventFormTarget | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<VenueEvent | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setEvents([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            setEvents(await fetchVenueEvents(currentWorkspaceId))
        } catch (error) {
            toast({ title: "Couldn't load events", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    function openCreate() {
        setFormTarget({ mode: "create" })
    }

    function openEdit(event: VenueEvent) {
        setFormTarget({ mode: "edit", event })
    }

    function closeForm() {
        setFormTarget(null)
    }

    const submitForm = useCallback(async (draft: VenueEventDraft) => {
        if (!formTarget || !currentWorkspaceId) return
        setIsSaving(true)
        try {
            if (formTarget.mode === "create") {
                const created = await createVenueEvent(draft, currentWorkspaceId)
                setEvents((current) => [...current, created])
                toast({ title: "Event added", variant: "success" })
            } else {
                const updated = await updateVenueEvent(formTarget.event.id, draft)
                setEvents((current) => current.map((event) => event.id === updated.id ? updated : event))
                toast({ title: "Event updated", variant: "success" })
            }
            setFormTarget(null)
        } catch (error) {
            toast({ title: "Couldn't save event", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }, [currentWorkspaceId, formTarget, toast])

    const toggleActive = useCallback(async (event: VenueEvent, active: boolean) => {
        setPendingId(event.id)
        setEvents((current) => current.map((item) => item.id === event.id ? { ...item, active } : item))
        try {
            await setVenueEventActive(event.id, active)
        } catch (error) {
            setEvents((current) => current.map((item) => item.id === event.id ? { ...item, active: !active } : item))
            toast({ title: "Couldn't update event", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setPendingId(null)
        }
    }, [toast])

    function openDelete(event: VenueEvent) {
        setDeleteTarget(event)
    }

    function closeDelete() {
        setDeleteTarget(null)
    }

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await deleteVenueEvent(deleteTarget.id)
            setEvents((current) => current.filter((event) => event.id !== deleteTarget.id))
            toast({ title: "Event deleted", variant: "success" })
            setDeleteTarget(null)
        } catch (error) {
            toast({ title: "Couldn't delete event", description: getErrorMessage(error, "The event could not be deleted."), variant: "error" })
        } finally {
            setIsDeleting(false)
        }
    }, [deleteTarget, toast])

    return {
        state: { events, isLoading, formTarget, deleteTarget, isSaving, isDeleting, pendingId },
        actions: { openCreate, openEdit, closeForm, submitForm, toggleActive, openDelete, closeDelete, confirmDelete },
    }
}
