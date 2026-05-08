import { useNavigate } from 'react-router-dom'
import { Title } from '@/components/display/text'
import { PublicLayout } from '@/features/components/public-layout'
import { OptionCard } from '@/features/components/option-card'
import { routes } from '@/screens/console-routes'


export function HomeScreen() {
  const navigate = useNavigate()

  const handleRequest = () => navigate(routes.publicRequest)
  const handleBooking = () => navigate(routes.publicBooking)
  const handleTrack = () => navigate(routes.publicTrack)

  return (
    <PublicLayout className="px-4">
      <div className="py-12">
        <Title.h3 className="text-center">MOC Request Portal</Title.h3>
      </div>

      <div className="w-full space-y-4">
        <OptionCard
          icon={<img src="./assets/icon_inbox.png" className='size-20' />}
          title="Make a Request"
          description="Submit a new production or media request with full details."
          onClick={handleRequest}
        />
        <OptionCard
          icon={<img src="./assets/icon_toolbox.png" className='size-20' />}
          title="Book Equipment"
          description="Browse available equipment and reserve what you need."
          onClick={handleBooking}
        />
        <OptionCard
          icon={<img src="./assets/icon_folder.png" className='size-20' />}
          title="Track a Submission"
          description="Look up the status of an existing request or booking."
          onClick={handleTrack}
        />
      </div>
    </PublicLayout>
  )
}
