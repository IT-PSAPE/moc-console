import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Modal } from '@moc/ui/components/overlays/modal'
import { Input } from '@moc/ui/components/form/input'
import { AVATAR_CROP_VIEWPORT, useAvatarCropper } from './use-avatar-cropper'

type AvatarCropperModalProps = {
    open: boolean
    file: File | null
    onCancel: () => void
    onConfirm: (blob: Blob) => void
}

export function AvatarCropperModal({ open, file, onCancel, onConfirm }: AvatarCropperModalProps) {
    const cropper = useAvatarCropper(file, onConfirm)
    const { isExporting, natural, objectUrl, offset, scale } = cropper.state

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <Modal open={open} onOpenChange={handleOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:!max-w-md">
                        <Modal.Header>
                            <div className="flex flex-col gap-0.5">
                                <Label.md>Adjust your photo</Label.md>
                                <Paragraph.xs className="text-tertiary">
                                    Drag to reposition, or use the arrow keys when the photo is focused. Use the slider to zoom.
                                </Paragraph.xs>
                            </div>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col items-center gap-4 p-4">
                                <Button.Unstyled
                                    type="button"
                                    aria-label="Position photo. Use arrow keys to move it; hold Shift for larger movements."
                                    className="relative overflow-hidden rounded-full bg-secondary touch-none cursor-grab select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:cursor-grabbing"
                                    style={{ width: AVATAR_CROP_VIEWPORT, height: AVATAR_CROP_VIEWPORT }}
                                    onPointerDown={cropper.actions.startDrag}
                                    onPointerMove={cropper.actions.drag}
                                    onPointerUp={cropper.actions.stopDrag}
                                    onPointerCancel={cropper.actions.stopDrag}
                                    onKeyDown={cropper.actions.handlePositionKeyDown}
                                >
                                    {objectUrl && (
                                        <img
                                            src={objectUrl}
                                            alt=""
                                            width={natural?.w ?? AVATAR_CROP_VIEWPORT}
                                            height={natural?.h ?? AVATAR_CROP_VIEWPORT}
                                            onLoad={cropper.actions.loadImage}
                                            draggable={false}
                                            className="absolute top-0 left-0 max-w-none origin-top-left"
                                            style={natural ? {
                                                width: natural.w,
                                                height: natural.h,
                                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                                transformOrigin: '0 0',
                                            } : undefined}
                                        />
                                    )}
                                </Button.Unstyled>
                                <Input
                                    name="avatar-zoom"
                                    type="range"
                                    min={cropper.meta.minScale}
                                    max={cropper.meta.maxScale}
                                    step={(cropper.meta.maxScale - cropper.meta.minScale) / 100 || 0.01}
                                    value={scale}
                                    disabled={!natural}
                                    onChange={cropper.actions.changeZoom}
                                    style="ghost"
                                    className="w-full max-w-xs accent-brand"
                                    aria-label="Zoom"
                                />
                            </div>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="ghost" onClick={onCancel} disabled={isExporting}>Cancel</Button>
                            <Button onClick={cropper.actions.confirm} disabled={!natural || isExporting}>
                                {isExporting ? 'Saving…' : 'Use photo'}
                            </Button>
                        </Modal.Footer>
          </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
