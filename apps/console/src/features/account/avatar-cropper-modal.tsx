import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Modal } from '@moc/ui/components/overlays/modal'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

const VIEWPORT = 288
const OUTPUT = 512
const MAX_ZOOM_MULTIPLIER = 4

type AvatarCropperModalProps = {
    open: boolean
    file: File | null
    onCancel: () => void
    onConfirm: (blob: Blob) => void
}

export function AvatarCropperModal({ open, file, onCancel, onConfirm }: AvatarCropperModalProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)
    const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
    const [fitScale, setFitScale] = useState(1)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isExporting, setIsExporting] = useState(false)
    const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

    useEffect(() => {
        if (!file) {
            setObjectUrl(null)
            setNatural(null)
            return
        }
        const url = URL.createObjectURL(file)
        setObjectUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    function clampOffset(x: number, y: number, s: number, n: { w: number; h: number }) {
        const drawnW = n.w * s
        const drawnH = n.h * s
        const minX = VIEWPORT - drawnW
        const minY = VIEWPORT - drawnH
        return {
            x: Math.min(0, Math.max(minX, x)),
            y: Math.min(0, Math.max(minY, y)),
        }
    }

    const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        const w = img.naturalWidth
        const h = img.naturalHeight
        const fit = Math.max(VIEWPORT / w, VIEWPORT / h)
        setNatural({ w, h })
        setFitScale(fit)
        setScale(fit)
        const drawnW = w * fit
        const drawnH = h * fit
        setOffset({ x: (VIEWPORT - drawnW) / 2, y: (VIEWPORT - drawnH) / 2 })
    }, [])

    function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: offset.x,
            originY: offset.y,
        }
    }

    function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
        if (!dragRef.current || !natural) return
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        setOffset(clampOffset(dragRef.current.originX + dx, dragRef.current.originY + dy, scale, natural))
    }

    function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
        e.currentTarget.releasePointerCapture(e.pointerId)
        dragRef.current = null
    }

    function handleZoom(nextScale: number) {
        if (!natural) return
        const cx = VIEWPORT / 2
        const cy = VIEWPORT / 2
        const ratio = nextScale / scale
        const nx = cx - (cx - offset.x) * ratio
        const ny = cy - (cy - offset.y) * ratio
        setScale(nextScale)
        setOffset(clampOffset(nx, ny, nextScale, natural))
    }

    async function handleConfirm() {
        if (!natural || !objectUrl) return
        setIsExporting(true)
        try {
            const img = new Image()
            img.src = objectUrl
            await new Promise<void>((resolve, reject) => {
                if (img.complete) return resolve()
                img.onload = () => resolve()
                img.onerror = () => reject(new Error('Failed to decode image'))
            })

            const canvas = document.createElement('canvas')
            canvas.width = OUTPUT
            canvas.height = OUTPUT
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas 2D context unavailable')

            const exportRatio = OUTPUT / VIEWPORT
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(
                img,
                offset.x * exportRatio,
                offset.y * exportRatio,
                natural.w * scale * exportRatio,
                natural.h * scale * exportRatio,
            )

            const blob: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
                    'image/jpeg',
                    0.9,
                )
            })
            onConfirm(blob)
        } finally {
            setIsExporting(false)
        }
    }

    const minScale = fitScale
    const maxScale = fitScale * MAX_ZOOM_MULTIPLIER

    return (
        <Modal open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full !max-w-md">
                        <Modal.Header>
                            <div className="flex flex-col gap-0.5">
                                <Label.md>Adjust your photo</Label.md>
                                <Paragraph.xs className="text-tertiary">
                                    Drag to reposition. Use the slider to zoom.
                                </Paragraph.xs>
                            </div>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col items-center gap-4 p-4">
                                <div
                                    className="relative overflow-hidden rounded-full bg-secondary touch-none cursor-grab active:cursor-grabbing select-none"
                                    style={{ width: VIEWPORT, height: VIEWPORT }}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                >
                                    {objectUrl && (
                                        <img
                                            src={objectUrl}
                                            alt=""
                                            onLoad={handleImageLoad}
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
                                </div>
                                <input
                                    type="range"
                                    min={minScale}
                                    max={maxScale}
                                    step={(maxScale - minScale) / 100 || 0.01}
                                    value={scale}
                                    disabled={!natural}
                                    onChange={(e) => handleZoom(Number(e.target.value))}
                                    className="w-full max-w-xs accent-brand"
                                    aria-label="Zoom"
                                />
                            </div>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="ghost" onClick={onCancel} disabled={isExporting}>Cancel</Button>
                            <Button onClick={handleConfirm} disabled={!natural || isExporting}>
                                {isExporting ? 'Saving...' : 'Use photo'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
