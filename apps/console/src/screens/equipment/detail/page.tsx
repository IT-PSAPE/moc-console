import { useParams } from "react-router-dom"
import { useEquipmentDetail } from "@/features/equipment/use-equipment-detail"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Page } from "@moc/ui/components/layout/page"
import { Package } from "lucide-react"
import { EquipmentDetailContent } from "./equipment-detail-content"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"

export function EquipmentDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { state, actions } = useEquipmentDetail(id)
  useBreadcrumbOverride(id ?? "", state.equipment?.name)

  if (state.isLoading) {
    return <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
  }

  if (state.error) {
    return <Page><Page.Content width="standard" className="py-16"><ResourceLoadError title="Could not load equipment" error={state.error} onRetry={actions.retry} /></Page.Content></Page>
  }

  if (!state.equipment) {
    return (
      <Page><Page.Content width="standard" className="py-16">
        <EmptyState headingLevel="h1" icon={<Package />} title="Equipment not found" description="This item may have been deleted, or the link is no longer valid." />
      </Page.Content></Page>
    )
  }

  return <EquipmentDetailContent equipment={state.equipment} />
}
