import { useCallback, useEffect, useState } from "react"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { RequestCategoryDefinition } from "@moc/types/requests"
import { fetchRequestCategories } from "@/data/fetch-request-categories"
import { createRequestCategory, deleteRequestCategory, setRequestCategoryActive, updateRequestCategory, type RequestCategoryDraft } from "@/data/mutate-request-categories"
import { invalidateWorkspaceResource } from "@/data/workspace-resource-cache"
import { useWorkspace } from "@/lib/workspace-context"

export type RequestCategoryFormTarget = { mode: "create" } | { mode: "edit"; category: RequestCategoryDefinition }

function invalidateRequestResources(workspaceId: string): void {
    invalidateWorkspaceResource(workspaceId, "request-categories")
    invalidateWorkspaceResource(workspaceId, "requests:active")
    invalidateWorkspaceResource(workspaceId, "requests:archived")
}

export function useRequestCategoriesSettings() {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const [categories, setCategories] = useState<RequestCategoryDefinition[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [formTarget, setFormTarget] = useState<RequestCategoryFormTarget | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<RequestCategoryDefinition | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setCategories([])
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        try {
            setCategories(await fetchRequestCategories(currentWorkspaceId))
        } catch (error) {
            toast({ title: "Couldn't load categories", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [currentWorkspaceId, toast])

    useEffect(() => { void load() }, [load])

    function openCreate() {
        setFormTarget({ mode: "create" })
    }

    function openEdit(category: RequestCategoryDefinition) {
        setFormTarget({ mode: "edit", category })
    }

    function closeForm() {
        setFormTarget(null)
    }

    const submitForm = useCallback(async (draft: RequestCategoryDraft) => {
        if (!formTarget || !currentWorkspaceId) return
        setIsSaving(true)
        try {
            if (formTarget.mode === "create") {
                const created = await createRequestCategory(draft, currentWorkspaceId)
                setCategories((current) => [...current, created])
                toast({ title: "Category added", variant: "success" })
            } else {
                const updated = await updateRequestCategory(formTarget.category.id, draft)
                setCategories((current) => current.map((item) => item.id === updated.id ? updated : item))
                toast({ title: "Category updated", variant: "success" })
            }
            invalidateRequestResources(currentWorkspaceId)
            setFormTarget(null)
        } catch (error) {
            toast({ title: "Couldn't save category", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }, [currentWorkspaceId, formTarget, toast])

    const toggleActive = useCallback(async (category: RequestCategoryDefinition, active: boolean) => {
        setPendingId(category.id)
        setCategories((current) => current.map((item) => item.id === category.id ? { ...item, active } : item))
        try {
            await setRequestCategoryActive(category.id, active)
            if (currentWorkspaceId) invalidateRequestResources(currentWorkspaceId)
        } catch (error) {
            setCategories((current) => current.map((item) => item.id === category.id ? { ...item, active: !active } : item))
            toast({ title: "Couldn't update category", description: getErrorMessage(error, "Unknown error"), variant: "error" })
        } finally {
            setPendingId(null)
        }
    }, [currentWorkspaceId, toast])

    function openDelete(category: RequestCategoryDefinition) {
        setDeleteTarget(category)
    }

    function closeDelete() {
        setDeleteTarget(null)
    }

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await deleteRequestCategory(deleteTarget.id)
            setCategories((current) => current.filter((category) => category.id !== deleteTarget.id))
            if (currentWorkspaceId) invalidateRequestResources(currentWorkspaceId)
            toast({ title: "Category deleted", variant: "success" })
            setDeleteTarget(null)
        } catch (error) {
            toast({ title: "Couldn't delete category", description: getErrorMessage(error, "The category could not be deleted."), variant: "error" })
        } finally {
            setIsDeleting(false)
        }
    }, [currentWorkspaceId, deleteTarget, toast])

    return {
        state: { categories, isLoading, formTarget, deleteTarget, isSaving, isDeleting, pendingId },
        actions: { openCreate, openEdit, closeForm, submitForm, toggleActive, openDelete, closeDelete, confirmDelete },
    }
}
