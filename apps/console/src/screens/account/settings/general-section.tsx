import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { Section } from "@moc/ui/components/display/section"
import { SettingsRow } from "@moc/ui/components/display/settings-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { Input } from "@moc/ui/components/form/input"
import { useWorkspaceSettings } from "./use-workspace-settings"

export function GeneralSection() {
  const { state, actions, meta } = useWorkspaceSettings()

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setName(event.target.value)
  }

  if (!meta.workspace) {
    return <Paragraph.sm className="text-tertiary">No workspace selected.</Paragraph.sm>
  }

  return (
    <Section>
      <Section.Header title="General" description="Workspace name and URL slug." />

      <Section.Body>
        <DividedList>
          <SettingsRow label="Name" className="px-4 py-3 landscape:px-3">
            <Input
              aria-label="Workspace name"
              autoComplete="off"
              name="workspace-name"
              value={state.name}
              onChange={handleNameChange}
              placeholder="Workspace name"
              className="max-w-md"
              disabled={!meta.canManage}
            />
          </SettingsRow>

          <SettingsRow label="Slug" className="px-4 py-3 landscape:px-3">
            <Input aria-label="Workspace slug" autoCapitalize="none" autoComplete="off" name="workspace-slug" spellCheck={false} value={meta.workspace.slug} className="max-w-md" disabled readOnly />
          </SettingsRow>
        </DividedList>
      </Section.Body>

      {meta.canManage && (
        <div className="flex justify-end gap-2 pt-5">
          {meta.hasChanges && <Button variant="ghost" onClick={actions.discard} disabled={state.isSaving}>Discard</Button>}
          <Button onClick={actions.save} disabled={!meta.canSave}>{state.isSaving ? "Saving…" : "Save changes"}</Button>
        </div>
      )}
    </Section>
  )
}
