import { Paragraph } from '@moc/ui/components/display/text'
import { Page } from '@moc/ui/components/layout/page'
import { useOverviewContext } from './overview-context'

export function OverviewHeader() {
  const { state } = useOverviewContext()
  return <Page.Header>
    <Page.Heading>
      <Paragraph.xs className="text-tertiary">{state.dateLabel}</Paragraph.xs>
      <Page.Title>{state.greeting}</Page.Title>
    </Page.Heading>
  </Page.Header>
}
