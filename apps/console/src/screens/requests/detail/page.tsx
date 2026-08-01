import { useParams } from "react-router-dom"
import { useRequestDetailLoader } from "@/features/requests/use-request-detail-loader"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { Page } from "@moc/ui/components/layout/page"
import { Inbox } from "lucide-react"
import { RequestDetailContent } from "./request-detail-content"

export function RequestDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const detail = useRequestDetailLoader(id)
  useBreadcrumbOverride(id ?? "", detail.state.request?.title)

  if (detail.state.isLoading) {
    return <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
  }

  if (!detail.state.request) {
    return (
      <Page><Page.Content width="standard" className="py-16">
        <EmptyState headingLevel="h1" icon={<Inbox />} title="Request not found" description="This request may have been deleted, or the link is no longer valid." />
      </Page.Content></Page>
    )
  }

  return <RequestDetailContent request={detail.state.request} syncRequest={detail.actions.syncRequest} />
}
