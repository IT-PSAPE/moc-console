import { Section } from '@moc/ui/components/display/section'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Select } from '@moc/ui/components/form/select'
import { CheckboxGroup } from '@moc/ui/components/form/checkbox-group'
import { Button } from '@moc/ui/components/controls/button'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import { useUserPreferences } from '@/features/preferences/user-preferences-provider'

export function PreferencesSection() {
  const { state, actions, meta } = useUserPreferences()
  function renderView(option: (typeof meta.viewOptions)[number]) {
    return <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
  }
  function renderOverviewKind(option: (typeof meta.overviewItemOptions)[number]) {
    return <CheckboxGroup.Item key={option.value} value={option.value}>{option.label}</CheckboxGroup.Item>
  }
  return <Section>
    <Section.Header title="Preferences" description="Your personal defaults, across workspaces." />
    <Section.Body>
      {state.error ? <ResourceLoadError title="Preferences couldn't be loaded" error={state.error} onRetry={actions.retry} /> : state.isLoading ? <LoadingSpinner className="py-8" /> : <DividedList>
        <SettingsRow label="Default work view">
          <Select.Root name="default-calendar-view" items={meta.viewOptions} value={state.defaultCalendarView} onValueChange={actions.changeDefaultCalendarView} disabled={state.isSaving}>
            <Select.Trigger aria-label="Default work view" className="max-w-md" />
            <Select.Content>{meta.viewOptions.map(renderView)}</Select.Content>
          </Select.Root>
        </SettingsRow>
        <SettingsRow label="Overview shows" description="Your default agenda, on every device.">
          <Section.Body className="w-full gap-3">
            <CheckboxGroup.Root label="Default overview items" values={state.draftOverviewItemKinds} onValueChange={actions.changeOverviewItemKinds} disabled={state.isSaving}>
              {meta.overviewItemOptions.map(renderOverviewKind)}
            </CheckboxGroup.Root>
            <Button className="self-start" size="sm" variant="secondary" disabled={!state.hasOverviewChanges || state.isSaving} onClick={actions.saveOverviewItemKinds}>Save overview preferences</Button>
          </Section.Body>
        </SettingsRow>
      </DividedList>}
    </Section.Body>
  </Section>
}
