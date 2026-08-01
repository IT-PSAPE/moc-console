import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteStream, updateStream } from '@/data/mutate-streams'
import { fetchStreamById } from '@/data/fetch-streams'
import { useAuth } from '@/lib/auth-context'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import type { Stream } from '@moc/types/streams/stream'
import type { StreamFormData } from './stream-modal'
import { useStreams } from './streams-provider'
import { useCopyFeedback } from '@/hooks/use-copy-feedback'

export function useStreamDetail(id: string | undefined) {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { role } = useAuth()
    const { state: { streams }, actions: { loadStreams, syncStream, removeStream } } = useStreams()
    const [stream, setStream] = useState<Stream | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const copied = useCopyFeedback<'url' | 'key' | 'ingestion'>()

    useEffect(() => { void loadStreams() }, [loadStreams])

    useEffect(() => {
        if (!id) return
        const cached = streams.find((item) => item.id === id)
        if (cached) {
            setStream(cached)
            setIsLoading(false)
            return
        }
        let cancelled = false
        fetchStreamById(id).then((data) => {
            if (!cancelled) {
                setStream(data ?? null)
                setIsLoading(false)
            }
        })
        return () => { cancelled = true }
    }, [id, streams])

    const update = useCallback(async (params: StreamFormData) => {
        if (!stream) return
        try {
            const { thumbnail, ...fields } = params
            const { stream: updated, thumbnailError } = await updateStream({ ...stream, ...fields }, thumbnail)
            syncStream(updated)
            setStream(updated)
            toast(thumbnailError
                ? { title: "Stream updated, but the thumbnail wasn't applied", description: thumbnailError, variant: 'warning' }
                : { title: 'Stream updated', variant: 'success' })
        } catch (error) {
            const message = getErrorMessage(error, 'The stream could not be updated.')
            toast({ title: 'Failed to update stream', description: message, variant: 'error' })
            throw new Error(message)
        }
    }, [stream, syncStream, toast])

    const remove = useCallback(async () => {
        if (!stream) return
        setIsDeleting(true)
        try {
            await deleteStream(stream)
            removeStream(stream.id)
            toast({ title: 'Stream deleted', variant: 'success' })
            navigate('/streams')
        } catch (error) {
            toast({ title: 'Failed to delete stream', description: getErrorMessage(error, 'The stream could not be deleted.'), variant: 'error' })
        } finally {
            setIsDeleting(false)
            setDeleteOpen(false)
        }
    }, [navigate, removeStream, stream, toast])

    return {
        state: { stream, isLoading, editOpen, deleteOpen, isDeleting, copiedField: copied.state.copiedField },
        actions: {
            setEditOpen,
            setDeleteOpen,
            update,
            remove,
            copyStreamUrl: () => copied.actions.copy(stream?.streamUrl, 'url'),
            copyStreamKey: () => copied.actions.copy(stream?.streamKey, 'key'),
            copyIngestionUrl: () => copied.actions.copy(stream?.ingestionUrl, 'ingestion'),
        },
        meta: { canEdit: role?.can_update === true, canDelete: role?.can_delete === true, canViewStreamKey: role?.can_create === true },
    }
}
