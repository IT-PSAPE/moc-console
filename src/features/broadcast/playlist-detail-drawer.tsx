import { useState } from 'react'
import { Drawer, useDrawer } from '@/components/overlays/drawer'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Badge } from '@/components/display/badge'
import { Divider } from '@/components/display/divider'
import { Label, Paragraph, Title } from '@/components/display/text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { CircleDot, Film, ListMusic, Maximize2, Trash2, TriangleAlert, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { playlistStatusColor, playlistStatusLabel } from '@/types/broadcast/constants'
import type { Playlist } from '@/types/broadcast/broadcast'
import { useBroadcast } from '@/features/broadcast/broadcast-provider'
import { deletePlaylist } from '@/data/mutate-broadcast'
import { getErrorMessage } from '@/utils/get-error-message'
import { routes } from '@/screens/console-routes'

export function PlaylistDetailDrawer({ playlist }: { playlist: Playlist }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="w-full !max-w-lg">
                <PlaylistDetailDrawerContent playlist={playlist} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}

function PlaylistDetailDrawerContent({ playlist }: { playlist: Playlist }) {
    const { actions: drawerActions } = useDrawer()
    const { actions: { removePlaylist } } = useBroadcast()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const [deleteOpen, setDeleteOpen] = useState(false)

    const cueCount = playlist.cues.length
    const uniqueMediaCount = new Set(playlist.cues.map((cue) => cue.mediaItemId)).size

    function handleOpenFullPage() {
        drawerActions.close()
        navigate(`/${routes.broadcastPlaylistDetail.replace(':id', playlist.id)}`)
    }

    async function handleDelete() {
        try {
            await deletePlaylist(playlist.id)
            removePlaylist(playlist.id)
            toast({ title: 'Playlist deleted', variant: 'success' })
            setDeleteOpen(false)
            drawerActions.close()
        } catch (error) {
            toast({
                title: 'Failed to delete playlist',
                description: getErrorMessage(error, 'The playlist could not be deleted.'),
                variant: 'error',
            })
        }
    }

    return (
        <>
            <Drawer.Header className="flex items-center gap-1">
                <Button.Icon variant="ghost" icon={<X />} onClick={drawerActions.close} />
                <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} />
                <div className="flex-1" />
                <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
            </Drawer.Header>

            <Drawer.Content className="py-4">
                <div className="px-4 pb-2">
                    <Title.h6>{playlist.name}</Title.h6>
                    {playlist.description ? (
                        <Paragraph.sm className="text-tertiary pt-1">{playlist.description}</Paragraph.sm>
                    ) : (
                        <Paragraph.sm className="text-quaternary pt-1">No description</Paragraph.sm>
                    )}
                </div>

                <Divider className="px-4 py-3" />

                <div className="flex flex-col gap-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Status</Label.sm>
                        <Badge
                            label={playlistStatusLabel[playlist.status]}
                            color={playlistStatusColor[playlist.status]}
                            icon={<CircleDot />}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Unique Media Items</Label.sm>
                        <Badge
                            label={`${uniqueMediaCount} item${uniqueMediaCount !== 1 ? 's' : ''}`}
                            icon={<Film />}
                            color={uniqueMediaCount > 0 ? 'blue' : 'gray'}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Cues</Label.sm>
                        <Badge
                            label={`${cueCount} cue${cueCount !== 1 ? 's' : ''}`}
                            icon={<ListMusic />}
                            color={cueCount > 0 ? 'purple' : 'gray'}
                        />
                    </div>
                </div>
            </Drawer.Content>

            <Drawer.Footer className="justify-end">
                <Button variant="secondary" onClick={drawerActions.close}>Close</Button>
                <Button icon={<Maximize2 />} onClick={handleOpenFullPage}>Open Playlist</Button>
            </Drawer.Footer>

            <Modal.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Positioner>
                        <Modal.Panel className="w-full max-w-md">
                            <Modal.Header>
                                <Label.md>Delete Playlist</Label.md>
                            </Modal.Header>
                            <Modal.Content className="p-4 flex-row gap-4">
                                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                                <Paragraph.sm className="text-secondary">
                                    Are you sure you want to delete this playlist? This action cannot be undone.
                                </Paragraph.sm>
                            </Modal.Content>
                            <Modal.Footer className="justify-end">
                                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleDelete}>Delete Playlist</Button>
                            </Modal.Footer>
                        </Modal.Panel>
                    </Modal.Positioner>
                </Modal.Portal>
            </Modal.Root>
        </>
    )
}
