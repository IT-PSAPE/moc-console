import { useFeedback } from '@/components/feedback/feedback-provider'
import { fetchAssigneesByRequestId, type ResolvedAssignee } from '@/data/fetch-assignees'
import { addRequestAssignee, archiveRequest, deleteRequest, removeRequestAssignee, unarchiveRequest } from '@/data/mutate-requests'
import type { Request } from '@/types/requests'
import { useCallback, useEffect, useState, type ChangeEventHandler } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { useRequestStore } from './use-request-store'
import { useRequests } from './request-provider'

type UseRequestDetailOptions = {
    request: Request
    setAssignees: (assignees: ResolvedAssignee[]) => void
    syncRequest: (request: Request) => void
}

export function useRequestDetail({ request, setAssignees, syncRequest }: UseRequestDetailOptions) {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { actions: { removeRequest } } = useRequests()
    const store = useRequestStore(request, { syncRequest })
    const { discard, save, updateField } = store.actions
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const blocker = useBlocker(store.state.isDirty)

    useEffect(() => {
        if (!store.state.isDirty) return

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [store.state.isDirty])

    const refreshAssignees = useCallback(async () => {
        const updatedAssignees = await fetchAssigneesByRequestId(request.id)
        setAssignees(updatedAssignees)
    }, [request.id, setAssignees])

    const handleAddMember = useCallback(async (userId: string, duty: string) => {
        try {
            await addRequestAssignee(request.id, userId, duty)
            await refreshAssignees()
        } catch {
            toast({ title: 'Failed to add member', variant: 'error' })
        }
    }, [refreshAssignees, request.id, toast])

    const handleRemoveMember = useCallback(async (userId: string) => {
        try {
            await removeRequestAssignee(request.id, userId)
            await refreshAssignees()
        } catch {
            toast({ title: 'Failed to remove member', variant: 'error' })
        }
    }, [refreshAssignees, request.id, toast])

    const handleSave = useCallback(async () => {
        try {
            await save()
            toast({ title: 'Request saved', variant: 'success' })
        } catch {
            toast({ title: 'Failed to save request', variant: 'error' })
        }
    }, [save, toast])

    const handleBlockerSave = useCallback(async () => {
        try {
            await save()
            toast({ title: 'Request saved', variant: 'success' })
            if (blocker.state === 'blocked') blocker.proceed()
        } catch {
            toast({ title: 'Failed to save request', variant: 'error' })
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
            if (request.status === 'archived') {
                await unarchiveRequest(request.id)
                syncRequest({ ...request, status: 'not_started' })
                toast({ title: 'Request unarchived', variant: 'success' })
                return
            }

            await archiveRequest(request.id)
            syncRequest({ ...request, status: 'archived' })
            toast({ title: 'Request archived', variant: 'success' })
        } catch {
            toast({ title: 'Failed to update request', variant: 'error' })
        }
    }, [request, syncRequest, toast])

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
            navigate('/requests/all-requests')
        } catch {
            toast({ title: 'Failed to delete request', variant: 'error' })
        } finally {
            setIsDeleting(false)
        }
    }, [navigate, removeRequest, request.id, toast])

    const handleContentChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>((event) => {
        updateField('content', event.target.value)
    }, [updateField])

    return {
        blockerState: blocker.state,
        isDeleting,
        showDeleteModal,
        store,
        actions: {
            closeDeleteModal,
            handleAddMember,
            handleArchiveToggle,
            handleBlockerCancel,
            handleBlockerDiscard,
            handleBlockerSave,
            handleContentChange,
            handleDelete,
            handleRemoveMember,
            handleSave,
            openDeleteModal,
        },
    }
}
