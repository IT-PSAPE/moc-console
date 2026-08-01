import { ArrowLeft } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { Paragraph, Title } from '@moc/ui/components/display/text'

type FlowHeaderProps = {
  title: string
  description?: string
  onBack: () => void
}

export function FlowHeader({ title, description, onBack }: FlowHeaderProps) {
  return (
    <header className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_10rem] sm:items-start">
      <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack} className="w-fit">Back</Button>
      <div className="flex min-w-0 flex-col gap-1 sm:text-center">
        <Title.h1 className="title-h3">{title}</Title.h1>
        {description && <Paragraph.sm className="text-secondary">{description}</Paragraph.sm>}
      </div>
    </header>
  )
}
