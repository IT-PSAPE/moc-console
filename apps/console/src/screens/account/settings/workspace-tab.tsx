import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { Section } from "@moc/ui/components/display/section"
import { SettingsRow } from "@moc/ui/components/display/settings-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { Input } from "@moc/ui/components/form/input"
import { useWorkspaceSettings } from "./use-workspace-settings"

export function WorkspaceTab() {
  const { state, actions, meta } = useWorkspaceSettings()

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setName(event.target.value)
  }

  if (!meta.workspace) {
    return <Paragraph.sm className="text-tertiary">No workspace selected.</Paragraph.sm>
  }

  return (
    <Section>
      <Section.Header title="General" description="Update the name shown across this workspace." />

      <Section.Body className="gap-2">
        <SettingsRow label="Name">
          <Input
            aria-label="Workspace name"
            autoComplete="off"
            name="workspace-name"
            value={state.name}
            onChange={handleNameChange}
            placeholder="Workspace name"
            disabled={!meta.canManage}
          />
        </SettingsRow>

        <SettingsRow label="Slug" description="Assigned when the workspace is created.">
          <Input aria-label="Workspace slug" autoCapitalize="none" autoComplete="off" name="workspace-slug" spellCheck={false} value={meta.workspace.slug} disabled readOnly />
        </SettingsRow>
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
