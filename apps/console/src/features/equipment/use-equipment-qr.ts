import { useEffect, useRef } from 'react'
import { useCopyFeedback } from '@/hooks/use-copy-feedback'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { Equipment } from '@moc/types/equipment'
import { buildEquipmentQrPayload } from '@moc/utils/equipment-scan'
import { equipmentQrDocument, equipmentQrFileName } from './equipment-qr-document'

export function useEquipmentQr(equipment: Equipment) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const printWindowRef = useRef<Window | null>(null)
  const copied = useCopyFeedback<'payload'>()
  const { toast } = useFeedback()
  const payload = buildEquipmentQrPayload(equipment)

  useEffect(() => () => { printWindowRef.current?.close() }, [])

  function download(): void {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = equipmentQrFileName(equipment)
      link.click()
    } catch {
      toast({ title: 'Could not download the QR code', description: 'Try again.', variant: 'error' })
    }
  }

  function print(): void {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const imageUrl = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank', 'width=420,height=560')
      if (!printWindow) {
        toast({ title: 'Allow pop-ups to print', description: 'Allow pop-ups for this site, then choose Print again.', variant: 'error' })
        return
      }
      printWindowRef.current?.close()
      printWindowRef.current = printWindow
      printWindow.opener = null

      function closePrintWindow(): void {
        printWindow?.close()
        if (printWindowRef.current === printWindow) printWindowRef.current = null
      }

      function printLabel(): void {
        try {
          printWindow?.focus()
          printWindow?.print()
        } catch {
          closePrintWindow()
          toast({ title: 'Could not print the QR code', description: 'Try downloading the image instead.', variant: 'error' })
        }
      }

      // Install handlers from this trusted bundle; an inline script in the
      // new document would be blocked by the console's inherited CSP.
      printWindow.document.open()
      printWindow.addEventListener('load', printLabel, { once: true })
      printWindow.addEventListener('afterprint', closePrintWindow, { once: true })
      printWindow.document.write(equipmentQrDocument(equipment, imageUrl))
      printWindow.document.close()
    } catch {
      printWindowRef.current?.close()
      printWindowRef.current = null
      toast({ title: 'Could not print the QR code', description: 'Try downloading the image instead.', variant: 'error' })
    }
  }

  function copy(): void {
    void copied.actions.copy(payload, 'payload')
  }

  return {
    state: { hasCopied: copied.state.copiedField === 'payload', payload },
    actions: { copy, download, print },
    meta: { canvasRef },
  }
}
