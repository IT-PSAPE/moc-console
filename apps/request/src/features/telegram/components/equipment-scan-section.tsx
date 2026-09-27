import { ScanLine } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Section } from "@moc/ui/components/display/section"
import { EquipmentList } from "./equipment-list"
import { useEquipmentScan } from "@/features/telegram/use-equipment-scan"
import { useAutoStartScan } from "@/features/telegram/use-auto-start-scan"
import { useMiniAppContext } from "@/features/telegram/mini-app-context"
import type { MiniAppEquipmentItem, MiniAppScanMode } from "@moc/notifications"

type EquipmentScanSectionProps = {
  bookingId: string
  items: MiniAppEquipmentItem[]
  scanMode: MiniAppScanMode | null
  autoStart: boolean
}

export function EquipmentScanSection({ bookingId, items, scanMode, autoStart }: EquipmentScanSectionProps) {
  const { state, meta, actions } = useMiniAppContext()
  const scan = useEquipmentScan({
    bookingId,
    items,
    scanMode,
    initData: state.initData,
    webApp: meta.webApp,
    onSubmitted: actions.applyResponse,
  })
  useAutoStartScan({ autoStart, canStart: scanMode !== null && items.length > 0, start: scan.actions.start })

  const progress = scanMode ? `${scan.state.scannedCount}/${scan.state.totalCount} scanned` : undefined

  return (
    <Section>
      <Section.Header title={`Equipment (${items.length})`} description={progress} />
      <Section.Body className="gap-4">
        <EquipmentList items={items} scannedItemIds={scan.state.scannedItemIds} />
        {scanMode && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={<ScanLine />} disabled={scan.state.isSubmitting} onClick={scan.actions.start}>
              Scan items
            </Button>
            {scan.state.isScanning && (
              <Button disabled={scan.state.isSubmitting} onClick={scan.actions.finish}>
                Done
              </Button>
            )}
          </div>
        )}
      </Section.Body>
    </Section>
  )
}
