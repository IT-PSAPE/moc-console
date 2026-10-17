import { Section } from '@moc/ui/components/display/section'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Select } from '@moc/ui/components/form/select'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import type { DateFormatPreset } from '@moc/notifications'
import { useMessageFormat } from './use-message-format'

export function DateTimeSection() {
    const { state, actions } = useMessageFormat()
    function renderTimezone(item: { label: string; value: string }) {
        return <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>
    }
    function renderDateFormat(item: { label: string; value: DateFormatPreset }) {
        return <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>
    }
    return (
        <Section>
            <Section.Header title="Date and time" description="Choose the time zone and date format for messages." />
            <Section.Body>
                {state.loadError ? <ResourceLoadError title="Date and time settings couldn't be loaded" error={state.loadError} onRetry={actions.retryLoad} /> : state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <DividedList>
                        <SettingsRow label="Time zone">
                            <Select.Root name="notification-timezone" items={state.timezoneItems} value={state.timezone} onValueChange={actions.changeTimezone}>
                                <Select.Trigger aria-label="Time zone" className="max-w-md" />
                                <Select.Content>{state.timezoneItems.map(renderTimezone)}</Select.Content>
                            </Select.Root>
                        </SettingsRow>
                        <SettingsRow label="Date format">
                            <Select.Root name="notification-date-format" items={state.dateFormatItems} value={state.dateFormat} onValueChange={actions.changeDateFormat}>
                                <Select.Trigger aria-label="Date format" className="max-w-md" />
                                <Select.Content>{state.dateFormatItems.map(renderDateFormat)}</Select.Content>
                            </Select.Root>
                        </SettingsRow>
                    </DividedList>
                )}
            </Section.Body>
        </Section>
    )
}
