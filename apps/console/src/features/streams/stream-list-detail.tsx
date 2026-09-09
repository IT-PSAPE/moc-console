import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { StreamDetailPanel } from './stream-detail-drawer'
import { MeetingDetailPanel } from './meeting-detail-drawer'

type StreamSelection = {
    item: Stream
    kind: 'stream'
    onDelete: (stream: Stream) => void
    onEdit: (stream: Stream) => void
}

type MeetingSelection = {
    item: ZoomMeeting
    kind: 'meeting'
    onDelete: (meeting: ZoomMeeting) => void
    onEdit: (meeting: ZoomMeeting) => void
}

type DetailSelection = MeetingSelection | StreamSelection

type StreamListDetailContextValue = {
    state: {
        selection: DetailSelection | null
    }
    actions: {
        close: () => void
        selectMeeting: (meeting: ZoomMeeting, onEdit: (meeting: ZoomMeeting) => void, onDelete: (meeting: ZoomMeeting) => void) => void
        selectStream: (stream: Stream, onEdit: (stream: Stream) => void, onDelete: (stream: Stream) => void) => void
    }
    meta: {
        isOpen: boolean
    }
}

const StreamListDetailContext = createContext<StreamListDetailContextValue | null>(null)

export function useStreamListDetail() {
    const context = useContext(StreamListDetailContext)
    if (!context) throw new Error('useStreamListDetail must be used within StreamListDetail.Root')
    return context
}

function StreamListDetailRoot({ children }: { children: ReactNode }) {
    const [selection, setSelection] = useState<DetailSelection | null>(null)
    const close = useCallback(() => setSelection(null), [])
    const selectMeeting = useCallback((meeting: ZoomMeeting, onEdit: (meeting: ZoomMeeting) => void, onDelete: (meeting: ZoomMeeting) => void) => {
        setSelection({ item: meeting, kind: 'meeting', onDelete, onEdit })
    }, [])
    const selectStream = useCallback((stream: Stream, onEdit: (stream: Stream) => void, onDelete: (stream: Stream) => void) => {
        setSelection({ item: stream, kind: 'stream', onDelete, onEdit })
    }, [])

    const value = useMemo<StreamListDetailContextValue>(() => ({
        state: { selection },
        actions: { close, selectMeeting, selectStream },
        meta: { isOpen: selection !== null },
    }), [close, selectMeeting, selectStream, selection])

    function handleOpenChange(open: boolean) {
        if (!open) close()
    }

    function handleEditStream(stream: Stream) {
        if (selection?.kind !== 'stream') return
        close()
        selection.onEdit(stream)
    }

    function handleDeleteStream(stream: Stream) {
        if (selection?.kind !== 'stream') return
        close()
        selection.onDelete(stream)
    }

    function handleEditMeeting(meeting: ZoomMeeting) {
        if (selection?.kind !== 'meeting') return
        close()
        selection.onEdit(meeting)
    }

    function handleDeleteMeeting(meeting: ZoomMeeting) {
        if (selection?.kind !== 'meeting') return
        close()
        selection.onDelete(meeting)
    }

    return (
        <StreamListDetailContext.Provider value={value}>
            <SplitPanel open={selection !== null} onOpenChange={handleOpenChange} detailLabel={selection?.kind === 'meeting' ? 'Meeting details' : 'Stream details'}>
                <SplitPanel.Primary>{children}</SplitPanel.Primary>
                <SplitPanel.ResizeHandle />
                <SplitPanel.Detail>
                    {selection?.kind === 'stream' && <StreamDetailPanel stream={selection.item} onClose={close} onEdit={handleEditStream} onDelete={handleDeleteStream} />}
                    {selection?.kind === 'meeting' && <MeetingDetailPanel meeting={selection.item} onClose={close} onEdit={handleEditMeeting} onDelete={handleDeleteMeeting} />}
                </SplitPanel.Detail>
            </SplitPanel>
        </StreamListDetailContext.Provider>
    )
}

export const StreamListDetail = { Root: StreamListDetailRoot }
