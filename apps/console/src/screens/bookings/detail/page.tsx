import { useParams } from "react-router-dom"
import { useBookingDetail } from "@/features/equipment/use-booking-detail"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Page } from "@moc/ui/components/layout/page"
import { ClipboardList } from "lucide-react"
import { BookingDetailContent } from "./booking-detail-content"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { state, actions } = useBookingDetail(id)
  useBreadcrumbOverride(id ?? "", state.booking?.title)

  if (state.isLoading) {
    return <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
  }

  if (state.error) {
    return <Page><Page.Content width="standard" className="py-16"><ResourceLoadError title="Could not load booking" error={state.error} onRetry={actions.retry} /></Page.Content></Page>
  }

  if (!state.booking) {
    return (
      <Page><Page.Content width="standard" className="py-16">
        <EmptyState headingLevel="h1" icon={<ClipboardList />} title="Booking not found" description="This booking may have been deleted, or the link is no longer valid." />
      </Page.Content></Page>
    )
  }

  return <BookingDetailContent booking={state.booking} />
}
