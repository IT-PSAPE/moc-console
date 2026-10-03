import { ScheduledTemplateProvider } from '@/features/scheduled-messages/scheduled-template-context'
import { ScheduledTemplateForm } from '@/features/scheduled-messages/components/scheduled-template-form'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Alert } from '@moc/ui/components/feedback/alert'
import { Button } from '@moc/ui/components/controls/button'
import { useScheduledTemplatePage } from './use-scheduled-template-page'
export function ScheduledTemplateScreen() {
    const state = useScheduledTemplatePage()
    if (state.loading) return <LoadingSpinner className="py-16" />
    if (state.error) return <Alert variant="error" title="Couldn't load template" description={state.error} action={<Button variant="secondary" onClick={state.reload}>Retry</Button>} />
    return <ScheduledTemplateProvider key={state.key}><ScheduledTemplateForm /></ScheduledTemplateProvider>
}
