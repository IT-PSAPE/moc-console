import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchZoomMeetingById } from '@/data/fetch-zoom'
import { deleteZoomMeeting, updateZoomMeeting, type CreateMeetingParams } from '@/data/mutate-zoom'
import { useAuth } from '@/lib/auth-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { useStreams } from './streams-provider'
import { useCopyFeedback } from '@/hooks/use-copy-feedback'

export function useMeetingDetail(id: string | undefined) {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { role } = useAuth()
    const { state: { zoomMeetings }, actions: { loadZoomMeetings, syncMeeting, removeMeeting } } = useStreams()
    const [meeting, setMeeting] = useState<ZoomMeeting | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const copied = useCopyFeedback<'join' | 'pass'>()

    useEffect(() => { void loadZoomMeetings() }, [loadZoomMeetings])

    useEffect(() => {
        if (!id) return
        const cached = zoomMeetings.find((item) => item.id === id)
        if (cached) {
            setMeeting(cached)
            setIsLoading(false)
            return
        }
        let cancelled = false
        fetchZoomMeetingById(id).then((data) => {
            if (!cancelled) {
                setMeeting(data ?? null)
                setIsLoading(false)
            }
        })
        return () => { cancelled = true }
    }, [id, zoomMeetings])

    const update = useCallback(async (params: CreateMeetingParams) => {
        if (!meeting) return
        try {
            const updated = await updateZoomMeeting({ ...meeting, ...params })
            syncMeeting(updated)
            setMeeting(updated)
            toast({ title: 'Meeting updated', variant: 'success' })
        } catch (error) {
            const message = getErrorMessage(error, 'The meeting could not be updated.')
            toast({ title: 'Failed to update meeting', description: message, variant: 'error' })
            throw new Error(message)
        }
    }, [meeting, syncMeeting, toast])

    const remove = useCallback(async () => {
        if (!meeting) return
        setIsDeleting(true)
        try {
            await deleteZoomMeeting(meeting)
            removeMeeting(meeting.id)
            toast({ title: 'Meeting deleted', variant: 'success' })
            navigate('/streams')
        } catch (error) {
            toast({ title: 'Failed to delete meeting', description: getErrorMessage(error, 'The meeting could not be deleted.'), variant: 'error' })
        } finally {
            setIsDeleting(false)
            setDeleteOpen(false)
        }
    }, [meeting, navigate, removeMeeting, toast])

    return {
        state: { meeting, isLoading, editOpen, deleteOpen, isDeleting, copiedField: copied.state.copiedField },
        actions: {
            setEditOpen,
            setDeleteOpen,
            update,
            remove,
            copyJoinUrl: () => copied.actions.copy(meeting?.joinUrl, 'join'),
            copyPassword: () => copied.actions.copy(meeting?.password, 'pass'),
        },
        meta: { canEdit: role?.can_update === true, canDelete: role?.can_delete === true },
    }
}
