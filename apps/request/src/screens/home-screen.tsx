import { useNavigate } from 'react-router-dom'
import { Title } from '@moc/ui/components/display/text'
import { Building2 } from 'lucide-react'
import { PublicLayout } from '@/features/components/public-layout'
import { OptionCard } from '@/features/components/option-card'
import { RequestDraftCard } from '@/features/components/request-draft-card'
import { useRequestDraftAvailability } from '@/features/hooks/use-request-draft-availability'
import { routes } from '@/screens/console-routes'


export function HomeScreen() {
  const navigate = useNavigate()
  const draft = useRequestDraftAvailability()

  const handleRequest = () => navigate(routes.publicRequest)
  const handleBooking = () => navigate(routes.publicBooking)
  const handleVenue = () => navigate(routes.publicVenue)
  const handleTrack = () => navigate(routes.publicTrack)
  const handleContinueDraft = () => navigate(routes.publicRequest)

  return (
    <PublicLayout>
      <div className="py-12">
        <Title.h1 className="title-h3 text-center">MOC request portal</Title.h1>
      </div>

      <div className="w-full space-y-4">
        {draft.state.hasDraft && (
          <RequestDraftCard
            onContinue={handleContinueDraft}
            discardOpen={draft.state.isDiscardOpen}
            onDiscardOpenChange={draft.actions.setDiscardOpen}
            onRequestDiscard={draft.actions.requestDiscard}
            onConfirmDiscard={draft.actions.confirmDiscard}
          />
        )}
        <OptionCard
          icon={<img src="/assets/icon_inbox.png" alt="" width="80" height="80" className='size-20' />}
          title="Make a request"
          description="Submit a new production or media request with full details."
          onClick={handleRequest}
        />
        <OptionCard
          icon={<img src="/assets/icon_toolbox.png" alt="" width="80" height="80" className='size-20' />}
          title="Book equipment"
          description="Browse available equipment and reserve what you need."
          onClick={handleBooking}
        />
        <OptionCard
          icon={<Building2 className="size-20 p-5" aria-hidden="true" />}
          title="Book a venue"
          description="Choose a venue and reserve a block of time."
          onClick={handleVenue}
        />
        <OptionCard
          icon={<img src="/assets/icon_folder.png" alt="" width="80" height="80" className='size-20' />}
          title="Track a submission"
          description="Look up the status of an existing request or booking."
          onClick={handleTrack}
        />
      </div>
    </PublicLayout>
  )
}
