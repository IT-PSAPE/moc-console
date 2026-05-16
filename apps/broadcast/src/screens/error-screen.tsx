import { useRouteError } from 'react-router-dom'
import { Title, Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { TriangleAlert } from 'lucide-react'
import { getErrorMessage } from '@moc/utils/get-error-message'

export function ErrorScreen() {
  const error = useRouteError()
  return (
    <div data-theme="dark" className="min-h-dvh bg-primary flex flex-col items-center justify-center gap-5 px-6 text-center">
      <TriangleAlert className="size-12 text-quaternary" />
      <div className="flex flex-col gap-2">
        <Title.h4>Something went wrong</Title.h4>
        <Paragraph.sm className="text-tertiary">{getErrorMessage(error, 'The broadcast could not be loaded.')}</Paragraph.sm>
      </div>
      <Button variant="secondary" onClick={() => window.location.reload()}>Reload</Button>
    </div>
  )
}
