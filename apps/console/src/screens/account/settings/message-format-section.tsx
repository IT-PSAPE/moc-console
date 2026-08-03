import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Select } from '@moc/ui/components/form/select'
import { Paragraph } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { DATE_FORMAT_OPTIONS, formatInstant } from '@moc/notifications'
import { useMessageFormat } from './use-message-format'

const COMMON_TIMEZONES = ['Africa/Harare', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']
const PREVIEW_ISO = '2026-05-21T17:00:00Z'
const DATE_FORMAT_SELECT_ITEMS = DATE_FORMAT_OPTIONS.map((option) => ({ label: `${option.label} — ${option.example}`, value: option.value }))

export function MessageFormatSection() {
    const { state, actions } = useMessageFormat()
    const timezoneOptions = COMMON_TIMEZONES.includes(state.timezone) ? COMMON_TIMEZONES : [state.timezone, ...COMMON_TIMEZONES]
    const timezoneItems = timezoneOptions.map((value) => ({ label: value, value }))

    return (
        <Section>
            <Section.Header title="Message formatting" description="Control how dates and times appear in outgoing messages." />
            <Section.Body className="gap-2">
                {state.isLoading ? <LoadingSpinner className="py-8" /> : (
                    <>
                        <SettingsRow label="Time zone">
                            <Select.Root name="notification-timezone" items={timezoneItems} value={state.timezone} onValueChange={actions.changeTimezone}>
                                <Select.Trigger aria-label="Time zone" />
                                <Select.Content>{timezoneOptions.map((timezone) => <Select.Item key={timezone} value={timezone}>{timezone}</Select.Item>)}</Select.Content>
                            </Select.Root>
                        </SettingsRow>
                        <SettingsRow label="Date format">
                            <div className="flex flex-col gap-1.5">
                                <Select.Root name="notification-date-format" items={DATE_FORMAT_SELECT_ITEMS} value={state.dateFormat} onValueChange={actions.changeDateFormat}>
                                    <Select.Trigger aria-label="Date format" />
                                    <Select.Content>{DATE_FORMAT_OPTIONS.map((option) => <Select.Item key={option.value} value={option.value}>{option.label} — {option.example}</Select.Item>)}</Select.Content>
                                </Select.Root>
                                <Paragraph.xs className="text-quaternary">Preview: {formatInstant(PREVIEW_ISO, state.timezone, state.dateFormat)}</Paragraph.xs>
                            </div>
                        </SettingsRow>
                    </>
                )}
            </Section.Body>
        </Section>
    )
}
