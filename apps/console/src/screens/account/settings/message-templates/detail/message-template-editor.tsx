import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Divider } from "@moc/ui/components/display/divider";
import { VariableTextEditor } from "@moc/ui/components/form/variable-text-editor";
import { Button } from "@moc/ui/components/controls/button";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { ArrowLeft } from "lucide-react";
import {
    type MessageType,
} from "@moc/notifications";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { Page } from "@moc/ui/components/layout/page";
import { useMessageTemplateEditor } from "./use-message-template-editor";

export function MessageTemplateEditor({ messageType }: { messageType: MessageType }) {
    const { state, actions, templateMeta, textareaRef, variables } = useMessageTemplateEditor(messageType);

    return (
        <Page>
            <Page.Header className="max-w-content-md">
                <Page.Heading>
                    <Button.Unstyled
                        type="button"
                        onClick={actions.back}
                        className="flex items-center gap-1 text-tertiary hover:text-primary"
                    >
                        <ArrowLeft className="size-4" />
                        <Label.xs className="text-inherit">Message templates</Label.xs>
                    </Button.Unstyled>
                    <Page.Title>{templateMeta.label}</Page.Title>
                    <Page.Description>{templateMeta.description}</Page.Description>
                </Page.Heading>
            </Page.Header>

            <Page.Content width="standard" className="flex flex-col gap-3">
                {state.isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        <VariableTextEditor.Root source={state.body} html={state.editorHtml} variables={variables} disabled={state.saving} textareaRef={textareaRef} onSourceChange={actions.changeBody} onRichChange={actions.changeRichBody} onInsertVariable={actions.insertTokenFromButton} richFallback={state.unsupportedTags.length ? <Paragraph.sm>This template uses advanced blocks ({state.unsupportedTags.join(', ')}). Edit these in Source to preserve their formatting.</Paragraph.sm> : null}>
                            <VariableTextEditor.Toolbar className="justify-between"><VariableTextEditor.ViewSwitch /><VariableTextEditor.Formatting /></VariableTextEditor.Toolbar>
                            <VariableTextEditor.Rich />
                            <VariableTextEditor.Source />
                        </VariableTextEditor.Root>

                        {state.unknownMessage && <Paragraph.xs className="text-error">{state.unknownMessage}</Paragraph.xs>}
                        <Divider />

                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    disabled={state.saving || !state.hasCustom}
                                    onClick={actions.restoreDefault}
                                >
                                    Restore default
                                </Button>
                                <Button variant="primary" disabled={!state.canSave} onClick={actions.save}>
                                    Save changes
                                </Button>
                            </div>
                    </>
                )}
            </Page.Content>

            <UnsavedChangesModal
                open={state.navigationBlocked}
                onSave={actions.saveAndProceed}
                onDiscard={actions.discardAndProceed}
                onCancel={actions.cancelNavigation}
                isSaving={state.saving}
                message="You have unsaved changes to this template. Save them before leaving, or discard to continue."
            />
        </Page>
    );
}
