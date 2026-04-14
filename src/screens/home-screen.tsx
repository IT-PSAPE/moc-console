import { useNavigate } from 'react-router-dom'
import { Title, Paragraph, Label } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { PublicLayout } from '@/features/components/public-layout'
import { OptionCard } from '@/features/components/option-card'
import { routes } from '@/screens/console-routes'
import { FileText, Package, Search } from 'lucide-react'

export function HomeScreen() {
  const navigate = useNavigate()

  function handleRequest() {
    navigate(routes.publicRequest)
  }

  function handleBooking() {
    navigate(routes.publicBooking)
  }

  function handleTrack() {
    navigate(routes.publicTrack)
  }

  return (
    <PublicLayout>
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Title.h2>MOC Request Portal</Title.h2>
          <Paragraph.md className="text-secondary">
            Submit a production request or book equipment for your next project.
          </Paragraph.md>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionCard
            icon={<FileText />}
            title="Make a Request"
            description="Submit a new production or media request with full details."
            onClick={handleRequest}
          />
          <OptionCard
            icon={<Package />}
            title="Book Equipment"
            description="Browse available equipment and reserve what you need."
            onClick={handleBooking}
          />
        </div>

        <Divider />

        <div className="flex flex-col items-center gap-3">
          <Label.sm className="text-secondary">Already submitted?</Label.sm>
          <Button variant="secondary" icon={<Search />} onClick={handleTrack}>
            Track a Submission
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
