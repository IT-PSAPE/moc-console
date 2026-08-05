import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Input } from '@moc/ui/components/form/input'
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
            <Section.Header title="Stale-item alerts" description="Notify selected members when work has not been updated." />
            <Section.Body className="gap-2">
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <>
                        <SettingsRow label="Flag after" description="Days without activity.">
                            <Input aria-label="Days without activity before flagging" name="stale-threshold-days" type="number" min={1} value={state.thresholdInput} onChange={actions.changeThreshold} onBlur={actions.saveThreshold} className="max-w-32" />
                        </SettingsRow>
                        <SettingsRow label="Recipients">
                            <MemberSearchPicker assignees={state.recipients.map(toAssignee)} onAdd={actions.addRecipient} onRemove={actions.removeRecipient} placeholder="Add a person…" emptyLabel="No recipients yet" />
                        </SettingsRow>
                    </>
                )}
            </Section.Body>
        </Section>
    )
}
