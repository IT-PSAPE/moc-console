import { useNavigate } from 'react-router-dom'
import { Title } from '@moc/ui/components/display/text'
import { ColorSchemeImage } from '@moc/ui/components/display/color-scheme-image'
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
        <Title.h1 className="title-h3 text-center">PE Church Request Portal</Title.h1>
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
          icon={<ColorSchemeImage lightSrc="/assets/light/icon_inbox.avif" darkSrc="/assets/dark/icon_inbox.avif" alt="" className="size-16" />}
          title="Make a request"
          description="Submit a new production or media request with full details."
          onClick={handleRequest}
        />
        <OptionCard
          icon={<ColorSchemeImage lightSrc="/assets/light/icon_toolbox.avif" darkSrc="/assets/dark/icon_toolbox.avif" alt="" className="size-16" />}
          title="Book equipment"
          description="Browse available equipment and reserve what you need."
          onClick={handleBooking}
        />
        <OptionCard
          icon={<ColorSchemeImage lightSrc="/assets/light/icon_venue.avif" darkSrc="/assets/dark/icon_venue.avif" alt="" className="size-16" />}
          title="Book a venue"
          description="Choose a venue and reserve a block of time."
          onClick={handleVenue}
        />
        <OptionCard
          icon={<ColorSchemeImage lightSrc="/assets/light/icon_folder.avif" darkSrc="/assets/dark/icon_folder.avif" alt="" className="size-16" />}
          title="Track a submission"
          description="Look up the status of an existing request or booking."
          onClick={handleTrack}
        />
      </div>
      <ColorSchemeImage
        lightSrc="/assets/light/background-sky.avif"
        darkSrc="/assets/dark/background-sky.avif"
        alt=""
        pictureClassName="absolute inset-0 -z-1"
        className="size-full object-cover"
      />
    </PublicLayout>
  )
}
