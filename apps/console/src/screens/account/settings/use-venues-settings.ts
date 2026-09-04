import { useCallback, useEffect, useState } from "react"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { Venue } from "@moc/types/venues"
import { fetchVenues } from "@/data/fetch-venues"
import { createVenue, deleteVenue, setVenueActive, updateVenue, type VenueDraft } from "@/data/mutate-venues"
import { useWorkspace } from "@/lib/workspace-context"

export type VenueFormTarget = { mode: "create" } | { mode: "edit"; venue: Venue }

export function useVenuesSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [venues, setVenues] = useState<Venue[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [formTarget, setFormTarget] = useState<VenueFormTarget | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setVenues([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            setVenues(await fetchVenues(currentWorkspaceId))
        } catch (error) {
            toast({ title: "Couldn't load venues", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    function openCreate() {
        setFormTarget({ mode: "create" })
    }

    function openEdit(venue: Venue) {
        setFormTarget({ mode: "edit", venue })
    }

    function closeForm() {
        setFormTarget(null)
    }

    const submitForm = useCallback(async (draft: VenueDraft) => {
        if (!formTarget || !currentWorkspaceId) return
        setIsSaving(true)
        try {
            if (formTarget.mode === "create") {
                const created = await createVenue(draft, currentWorkspaceId)
                setVenues((current) => [...current, created])
                toast({ title: "Venue added", variant: "success" })
            } else {
                const updated = await updateVenue(formTarget.venue.id, draft)
                setVenues((current) => current.map((venue) => venue.id === updated.id ? updated : venue))
                toast({ title: "Venue updated", variant: "success" })
            }
            setFormTarget(null)
        } catch (error) {
            toast({ title: "Couldn't save venue", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }, [currentWorkspaceId, formTarget, toast])

    const toggleActive = useCallback(async (venue: Venue, active: boolean) => {
        setPendingId(venue.id)
        setVenues((current) => current.map((item) => item.id === venue.id ? { ...item, active } : item))
        try {
            await setVenueActive(venue.id, active)
        } catch (error) {
            setVenues((current) => current.map((item) => item.id === venue.id ? { ...item, active: !active } : item))
            toast({ title: "Couldn't update venue", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setPendingId(null)
        }
    }, [toast])

    function openDelete(venue: Venue) {
        setDeleteTarget(venue)
    }

    function closeDelete() {
        setDeleteTarget(null)
    }

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await deleteVenue(deleteTarget.id)
            setVenues((current) => current.filter((venue) => venue.id !== deleteTarget.id))
            toast({ title: "Venue deleted", variant: "success" })
            setDeleteTarget(null)
        } catch (error) {
            toast({ title: "Couldn't delete venue", description: getErrorMessage(error, "The venue could not be deleted."), variant: "error" })
        } finally {
            setIsDeleting(false)
        }
    }, [deleteTarget, toast])

    return {
        state: { venues, isLoading, formTarget, deleteTarget, isSaving, isDeleting, pendingId },
        actions: { openCreate, openEdit, closeForm, submitForm, toggleActive, openDelete, closeDelete, confirmDelete },
    }
}
