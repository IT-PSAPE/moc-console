import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { Section } from '@moc/ui/components/display/section'
import { useDetailLinkState } from '@/hooks/use-detail-return'
import { ScheduleAgendaList } from '../schedule/schedule-agenda-list'
import { useOverviewContext } from './overview-context'

export function OverviewAgendaView() {
  const { state, actions } = useOverviewContext()
  const { returnTo } = useDetailLinkState()
  return <Section.Body className="gap-4">
    {state.error ? <RetryNotification title="Some upcoming items couldn't load" description={state.error.message} onRetry={actions.retryAgenda} /> : null}
    {state.loading && state.groups.length === 0 ? <LoadingSpinner className="py-12" /> : <ScheduleAgendaList groups={state.groups} returnTo={returnTo} emptyTitle={state.emptyTitle} className="overflow-visible p-0" />}
    {state.loading && state.groups.length > 0 ? <LoadingSpinner className="py-4" size="sm" /> : null}
  </Section.Body>
}
