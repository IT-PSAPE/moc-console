import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { archiveRequest, deleteRequest, unarchiveRequest } from '@/data/mutate-requests'
import type { Request } from '@moc/types/requests'
import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { useRequestStore } from './use-request-store'
import { useRequests } from './request-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useRequestAssignees } from './use-request-assignees'
import { useRequestRelatedChecklists } from './use-request-related-checklists'

type UseRequestDetailOptions = {
    request: Request
    syncRequest: (request: Request) => void
    assigneesEnabled?: boolean
    onArchiveChanged?: () => void
    onDeleted?: () => void
}

export function useRequestDetail({ request, syncRequest, assigneesEnabled = true, onArchiveChanged, onDeleted }: UseRequestDetailOptions) {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { actions: { removeRequest } } = useRequests()
    const store = useRequestStore(request, { syncRequest })
    const { discard, save, updateField } = store.actions
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const blocker = useBlocker(store.state.isDirty)
    const assigneeStore = useRequestAssignees(request.id, assigneesEnabled)
    const relatedChecklists = useRequestRelatedChecklists(request.id, assigneesEnabled)

    useEffect(() => {
        if (!store.state.isDirty) return

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [store.state.isDirty])

    const handleSave = useCallback(async () => {
        try {
            await save()
            toast({ title: 'Request saved', variant: 'success' })
            return true
        } catch (error) {
            toast({ title: 'Failed to save request', description: getErrorMessage(error, 'The request could not be saved.'), variant: 'error' })
            return false
        }
    }, [save, toast])

    const handleBlockerSave = useCallback(async () => {
        try {
            await save()
            toast({ title: 'Request saved', variant: 'success' })
            if (blocker.state === 'blocked') blocker.proceed()
        } catch (error) {
            toast({ title: 'Failed to save request', description: getErrorMessage(error, 'The request could not be saved.'), variant: 'error' })
        }
    }, [blocker, save, toast])

    const handleBlockerDiscard = useCallback(() => {
        discard()
        if (blocker.state === 'blocked') blocker.proceed()
    }, [blocker, discard])

    const handleBlockerCancel = useCallback(() => {
        if (blocker.state === 'blocked') blocker.reset()
    }, [blocker])

    const handleArchiveToggle = useCallback(async () => {
        try {
            const updatedAt = new Date().toISOString()
            if (request.status === 'archived') {
                await unarchiveRequest(request.id)
                syncRequest({ ...request, status: 'not_started', updatedAt })
                toast({ title: 'Request unarchived', variant: 'success' })
                onArchiveChanged?.()
                return
            }

            await archiveRequest(request.id)
            syncRequest({ ...request, status: 'archived', updatedAt })
            toast({ title: 'Request archived', variant: 'success' })
            onArchiveChanged?.()
        } catch (error) {
            toast({ title: 'Failed to update request', description: getErrorMessage(error, 'The request status could not be updated.'), variant: 'error' })
        }
    }, [onArchiveChanged, request, syncRequest, toast])

    const openDeleteModal = useCallback(() => {
        setShowDeleteModal(true)
    }, [])

    const closeDeleteModal = useCallback(() => {
        setShowDeleteModal(false)
    }, [])

    const handleDelete = useCallback(async () => {
        setIsDeleting(true)

        try {
            await deleteRequest(request.id)
            removeRequest(request.id)
            toast({ title: 'Request deleted', variant: 'success' })
            setShowDeleteModal(false)
            if (onDeleted) onDeleted()
            else navigate('/requests')
        } catch (error) {
            toast({ title: 'Failed to delete request', description: getErrorMessage(error, 'The request could not be deleted.'), variant: 'error' })
        } finally {
            setIsDeleting(false)
        }
    }, [navigate, onDeleted, removeRequest, request.id, toast])

    const handleContentChange = useCallback((content: string) => {
        updateField('content', content)
    }, [updateField])

    return {
        blockerState: blocker.state,
        assignees: assigneeStore.state.assignees,
        isLoadingAssignees: assigneeStore.state.isLoading,
        relatedChecklists: relatedChecklists.state,
        isDeleting,
        showDeleteModal,
        store,
        actions: {
            closeDeleteModal,
            handleAddMember: assigneeStore.actions.addMember,
            handleArchiveToggle,
            handleBlockerCancel,
            handleBlockerDiscard,
            handleBlockerSave,
            handleContentChange,
            handleDelete,
            handleRemoveMember: assigneeStore.actions.removeMember,
            refreshRelatedChecklists: relatedChecklists.actions.refresh,
            handleSave,
            openDeleteModal,
        },
    }
}
