import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type SyntheticEvent } from "react";

export const AVATAR_CROP_VIEWPORT = 288;
const AVATAR_CROP_OUTPUT = 512;
const MAX_ZOOM_MULTIPLIER = 4;

type NaturalSize = { w: number; h: number };

function clampOffset(x: number, y: number, scale: number, natural: NaturalSize) {
  const minimumX = AVATAR_CROP_VIEWPORT - natural.w * scale;
  const minimumY = AVATAR_CROP_VIEWPORT - natural.h * scale;
  return { x: Math.min(0, Math.max(minimumX, x)), y: Math.min(0, Math.max(minimumY, y)) };
}

export function useAvatarCropper(file: File | null, onConfirm: (blob: Blob) => void) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const loadImage = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
    const fit = Math.max(AVATAR_CROP_VIEWPORT / w, AVATAR_CROP_VIEWPORT / h);
    setNatural({ w, h });
    setFitScale(fit);
    setScale(fit);
    setOffset({ x: (AVATAR_CROP_VIEWPORT - w * fit) / 2, y: (AVATAR_CROP_VIEWPORT - h * fit) / 2 });
  }, []);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !natural) return;
    const x = dragRef.current.originX + event.clientX - dragRef.current.startX;
    const y = dragRef.current.originY + event.clientY - dragRef.current.startY;
    setOffset(clampOffset(x, y, scale, natural));
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function changeZoom(event: ChangeEvent<HTMLInputElement>) {
    if (!natural) return;
    const nextScale = Number(event.target.value);
    const center = AVATAR_CROP_VIEWPORT / 2;
    const ratio = nextScale / scale;
    setScale(nextScale);
    setOffset(clampOffset(center - (center - offset.x) * ratio, center - (center - offset.y) * ratio, nextScale, natural));
  }

  async function confirm() {
    if (!natural || !objectUrl) return;
    setIsExporting(true);
    try {
      const image = new Image();
      image.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        if (image.complete) return resolve();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to decode image"));
      });
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_CROP_OUTPUT;
      canvas.height = AVATAR_CROP_OUTPUT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context unavailable");
      const exportRatio = AVATAR_CROP_OUTPUT / AVATAR_CROP_VIEWPORT;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, offset.x * exportRatio, offset.y * exportRatio, natural.w * scale * exportRatio, natural.h * scale * exportRatio);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("toBlob returned null")), "image/jpeg", 0.9);
      });
      onConfirm(blob);
    } finally {
      setIsExporting(false);
    }
  }

  return {
    state: { isExporting, natural, objectUrl, offset, scale },
    actions: { changeZoom, confirm, drag, loadImage, startDrag, stopDrag },
    meta: { maxScale: fitScale * MAX_ZOOM_MULTIPLIER, minScale: fitScale },
  };
}
