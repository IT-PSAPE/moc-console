import { useNavigate } from 'react-router-dom'
import { Title } from '@moc/ui/components/display/text'
import { PublicLayout } from '@/features/components/public-layout'
import { OptionCard } from '@/features/components/option-card'
import { SubmissionDrafts } from '@/features/components/submission-drafts'
import { useSubmissionDrafts } from '@/features/hooks/use-submission-drafts'
import { routes } from '@/screens/console-routes'


export function HomeScreen() {
  const navigate = useNavigate()
  const submissionDrafts = useSubmissionDrafts()

  const handleRequest = () => navigate(routes.publicRequest)
  const handleBooking = () => navigate(routes.publicBooking)
  const handleVenue = () => navigate(routes.publicVenue)
  const handleTrack = () => navigate(routes.publicTrack)

  function handleContinueDraft(route: string) {
    navigate(route)
  }

  return (
    <PublicLayout>
      <div className="py-12">
        <Title.h1 className="title-h3 text-center">PE Church request portal</Title.h1>
      </div>

      <div className="w-full space-y-4">
        {submissionDrafts.state.drafts.length > 0 && (
          <SubmissionDrafts
            drafts={submissionDrafts.state.drafts}
            onContinue={handleContinueDraft}
            discardOpen={submissionDrafts.state.isDiscardOpen}
            onDiscardOpenChange={submissionDrafts.actions.setDiscardOpen}
            onRequestDiscard={submissionDrafts.actions.requestDiscard}
            onConfirmDiscard={submissionDrafts.actions.confirmDiscard}
          />
        )}
        <OptionCard
          icon={<img src="/assets/light/icon_inbox.avif" className='size-16' />}
          title="Make a request"
          description="Submit a new production or media request with full details."
          onClick={handleRequest}
          />
        <OptionCard
          icon={<img src="/assets/light/icon_toolbox.avif" className='size-16' />}
          title="Book equipment"
          description="Browse available equipment and reserve what you need."
          onClick={handleBooking}
        />
        <OptionCard
          icon={<img src="/assets/light/icon_venue.avif" className='size-16' />}
          title="Book a venue"
          description="Choose a venue and reserve a block of time."
          onClick={handleVenue}
        />
        <OptionCard
          icon={<img src="/assets/light/icon_folder.avif" className='size-16' />}
          title="Track a submission"
          description="Look up the status of an existing request or booking."
          onClick={handleTrack}
        />
      </div>
      <img src="./assets/light/background-sky.avif" alt="" className="w-full h-full object-cover absolute -z-1 inset-0" />
    </PublicLayout>
  )
}
