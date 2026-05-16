import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { TvMinimalPlay } from 'lucide-react'
import { routes } from '@/screens/broadcast-routes'

export function NotFoundScreen() {
  const navigate = useNavigate()
  return (
    <div data-theme="dark" className="min-h-dvh bg-primary flex flex-col items-center justify-center gap-5 px-6 text-center">
      <TvMinimalPlay className="size-12 text-quaternary" />
      <div className="flex flex-col gap-2">
        <Title.h4>Nothing to play here</Title.h4>
        <Paragraph.sm className="text-tertiary">This page doesn't exist or the playlist is no longer published.</Paragraph.sm>
      </div>
      <Button variant="secondary" onClick={() => navigate(routes.chooser)}>Back to start</Button>
    </div>
  )
}
