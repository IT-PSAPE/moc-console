import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { Alert } from '@moc/ui/components/feedback/alert'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { PublicLayout } from '@/features/components/public-layout'
import { TrackingResult } from '@/features/components/tracking-result'
import { TrackingRequestEditor } from '@/features/components/tracking-request-editor'
import { TrackingBookingEditor } from '@/features/components/tracking-booking-editor'
import { TrackingVenueEditor } from '@/features/components/tracking-venue-editor'
import { useTrackingLookup } from '@/features/hooks/use-tracking-lookup'
import { routes } from '@/screens/console-routes'
import { Search, FileSearch, Pencil, Trash2 } from 'lucide-react'
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import type { ChangeEvent, FormEvent } from 'react'

export function TrackScreen() {
  const navigate = useNavigate()
  const { state, actions } = useTrackingLookup()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    actions.lookup()
  }

  function handleBack() {
    navigate(routes.publicHome)
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setCode(event.target.value)
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) actions.closeDelete()
  }

  return (
    <PublicLayout className="py-8 sm:py-12">
      <FlowHeader title="Track submission" description="Enter your tracking code to view its status." onBack={handleBack} />

      <PublicFlow>
        <form onSubmit={handleSubmit} className="my-10 flex gap-2 sm:my-16">
          <Input
            aria-label="Tracking code"
            name="tracking-code"
            autoComplete="off"
            className="flex-1"
            icon={<Search />}
            placeholder="e.g. REQ-A1B2C3D4E5F6"
            value={state.code}
            onChange={handleCodeChange}
          />
          <Button type="submit" disabled={!state.code.trim() || state.loading}>
            {state.loading ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </form>

        {state.error && <Alert title="Request failed" description={state.error} variant="error" style="filled" />}

        {state.notice && <Alert title={state.notice} variant="success" style="filled" />}

        {state.loading && <div className="flex justify-center"><Spinner size="md" /></div>}

        {state.notFound && (
          <EmptyState
            icon={<FileSearch />}
            title="No submission found"
            description="No request or booking matches that tracking code. Double-check the code and try again."
          />
        )}

        {state.result && !state.editing && (
          <>
            <TrackingResult data={state.result} />
            {state.canModify ? (
              <PublicFlow.Actions>
                <Button variant="secondary" icon={<Pencil />} onClick={actions.beginEdit}>Edit details</Button>
                <Button variant="danger" icon={<Trash2 />} onClick={actions.openDelete}>Delete submission</Button>
              </PublicFlow.Actions>
            ) : (
              <Alert title="Changes are closed" description="This submission has already started or reached a final status, so it can no longer be edited or deleted with the tracking code." variant="info" style="filled" />
            )}
          </>
        )}

        {state.result?.type === 'request' && state.editing && <TrackingRequestEditor result={state.result} onSaved={actions.handleSaved} onCancel={actions.cancelEdit} />}
        {state.result?.type === 'booking' && state.editing && <TrackingBookingEditor result={state.result} onSaved={actions.handleSaved} onCancel={actions.cancelEdit} />}
        {state.result?.type === 'venue_booking' && state.editing && <TrackingVenueEditor result={state.result} onSaved={actions.handleSaved} onCancel={actions.cancelEdit} />}

      </PublicFlow>

      <ConfirmationDialog
        open={state.deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this submission?"
        description="This permanently removes the request or booking. This action cannot be undone."
        confirmLabel="Delete submission"
        isConfirming={state.deleting}
        onConfirm={actions.remove}
      />
    </PublicLayout>
  )
}
