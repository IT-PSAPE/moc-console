import { useParams } from "react-router-dom"
import { useVenueBookingDetail } from "@/features/venues/use-venue-booking-detail"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Page } from "@moc/ui/components/layout/page"
import { MapPin } from "lucide-react"
import { VenueBookingDetailContent } from "./venue-booking-detail-content"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"

export function VenueBookingDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const detail = useVenueBookingDetail(id)
  useBreadcrumbOverride(id ?? "", detail.state.booking?.title)

  if (detail.state.isLoading) {
    return <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
  }

  if (detail.state.error) {
    return <Page><Page.Content width="standard" className="py-16"><ResourceLoadError title="Could not load booking" error={detail.state.error} onRetry={detail.actions.retry} /></Page.Content></Page>
  }

  if (!detail.state.booking) {
    return (
      <Page><Page.Content width="standard" className="py-16">
        <EmptyState headingLevel="h1" icon={<MapPin />} title="Booking not found" description="This venue booking may have been deleted, or the link is no longer valid." />
      </Page.Content></Page>
    )
  }

  return <VenueBookingDetailContent booking={detail.state.booking} />
}
