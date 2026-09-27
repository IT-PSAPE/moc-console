import { Divider } from "@moc/ui/components/display/divider"
import { EntityStatusHeader } from "@/features/telegram/components/entity-status-header"
import { EntityFieldsList } from "@/features/telegram/components/entity-fields-list"
import { EntityActions } from "@/features/telegram/components/entity-actions"
import { EquipmentScanSection } from "@/features/telegram/components/equipment-scan-section"
import { useMiniAppContext } from "@/features/telegram/mini-app-context"
import type { MiniAppEntityDetail } from "@moc/notifications"

type EntityDetailScreenProps = {
  detail: MiniAppEntityDetail
  autoStartScan: boolean
}

export function EntityDetailScreen({ detail, autoStartScan }: EntityDetailScreenProps) {
  const { state, actions } = useMiniAppContext()
  const hasEquipment = detail.kind === "booking" && detail.equipment.length > 0

  return (
    <div className="flex flex-col gap-5">
      <EntityStatusHeader title={detail.title} status={detail.status} trackingCode={detail.trackingCode} />

      <Divider />
      <EntityFieldsList fields={detail.fields} notes={detail.notes} />

      {hasEquipment && (
        <>
          <Divider />
          <EquipmentScanSection bookingId={detail.id} items={detail.equipment} scanMode={detail.scanMode} autoStart={autoStartScan} />
        </>
      )}

      {detail.actions.length > 0 && <Divider />}
      <EntityActions
        entityType={detail.kind}
        entityId={detail.id}
        actions={detail.actions}
        actionPending={state.actionPending}
        onRunAction={actions.runAction}
      />
    </div>
  )
}
