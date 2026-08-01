import { Section } from '@moc/ui/components/display/section'
import { Divider } from '@moc/ui/components/display/divider'
import { Input } from '@moc/ui/components/form/input'
import { Label } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { MemberSearchPicker } from '@/features/assignees/member-search-picker'
import type { ResolvedAssignee } from '@/data/fetch-assignees'
import type { NotificationRecipient } from '@/data/notification-recipients'
import { useStaleAlerts } from './use-stale-alerts'

function toAssignee(recipient: NotificationRecipient): ResolvedAssignee {
    return { ...recipient, duty: recipient.telegramChatId ? '' : "Telegram isn't linked" }
}

export function StaleAlertsSection() {
    const { state, actions } = useStaleAlerts()
    return (
        <Section>
            <Section.Header title="Stale-item alerts" />
            <Divider className="my-6" />
            <Section.Body className="gap-6">
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <>
                        <div className="flex max-w-xs flex-col gap-2">
                            <Label.sm>Flag after</Label.sm>
                            <Input aria-label="Days without activity before flagging" name="stale-threshold-days" type="number" min={1} value={state.thresholdInput} onChange={actions.changeThreshold} onBlur={actions.saveThreshold} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label.sm>Recipients</Label.sm>
                            <MemberSearchPicker assignees={state.recipients.map(toAssignee)} onAdd={actions.addRecipient} onRemove={actions.removeRecipient} placeholder="Add a person…" emptyLabel="No recipients yet" />
                        </div>
                    </>
                )}
            </Section.Body>
        </Section>
    )
}
