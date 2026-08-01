import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { Divider } from "@moc/ui/components/display/divider"
import { Section } from "@moc/ui/components/display/section"
import { SettingsRow } from "@moc/ui/components/display/settings-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { useWorkspaceSettings } from "./use-workspace-settings"
import { UsersTab } from "./users-tab"

export function WorkspaceTab() {
  const { state, actions, meta } = useWorkspaceSettings()

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setName(event.target.value)
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSlug(event.target.value)
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    actions.setDescription(event.target.value)
  }

  if (!meta.workspace) {
    return <Paragraph.sm className="text-tertiary">No workspace selected.</Paragraph.sm>
  }

  return (
    <div className="flex flex-col">
      <Section>
        <Section.Header title="Workspace details" />
        <Divider className="my-6" />

        <Section.Body>
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

          <Divider className="my-6" />

          <SettingsRow label="Slug" description="Used in URLs.">
            <div className="flex flex-col gap-1">
              <Input
                aria-label="Workspace slug"
                autoCapitalize="none"
                autoComplete="off"
                name="workspace-slug"
                spellCheck={false}
                value={state.slug}
                onChange={handleSlugChange}
                placeholder="workspace-slug"
                disabled={!meta.canManage}
              />
              {meta.trimmedSlug.length > 0 && !meta.slugValid && (
                <Paragraph.xs className="text-error">Use lowercase letters, numbers, and hyphens only.</Paragraph.xs>
              )}
            </div>
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Description">
            <TextArea
              aria-label="Workspace description"
              autoComplete="off"
              name="workspace-description"
              rows={3}
              value={state.description}
              onChange={handleDescriptionChange}
              placeholder="What is this workspace for?"
              disabled={!meta.canManage}
            />
          </SettingsRow>
        </Section.Body>
      </Section>

      {meta.canManage && meta.hasChanges && (
        <>
          <Divider className="my-2" />
          <div className="flex justify-end gap-2 py-2">
            <Button variant="ghost" onClick={actions.discard} disabled={state.isSaving}>Discard</Button>
            <Button onClick={actions.save} disabled={!meta.canSave}>{state.isSaving ? "Saving…" : "Save changes"}</Button>
          </div>
        </>
      )}

      <Divider className="my-6" />
      <UsersTab />
    </div>
  )
}
