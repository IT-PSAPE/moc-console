import { useNavigate } from 'react-router-dom'
import { Title } from '@moc/ui/components/display/text'
import { PublicLayout } from '@/features/components/public-layout'
import { OptionCard } from '@/features/components/option-card'
import { routes } from '@/screens/console-routes'


export function HomeScreen() {
  const navigate = useNavigate()

  const handleRequest = () => navigate(routes.publicRequest)
  const handleBooking = () => navigate(routes.publicBooking)
  const handleTrack = () => navigate(routes.publicTrack)

  return (
    <PublicLayout>
      <div className="py-12">
        <Title.h1 className="title-h3 text-center">MOC request portal</Title.h1>
      </div>

      <div className="w-full space-y-4">
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
          icon={<img src="/assets/icon_folder.png" alt="" width="80" height="80" className='size-20' />}
          title="Track a submission"
          description="Look up the status of an existing request or booking."
          onClick={handleTrack}
        />
      </div>
    </PublicLayout>
  )
}
