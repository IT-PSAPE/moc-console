import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Divider } from "@moc/ui/components/display/divider";
import { RichTextEditor } from "@moc/ui/components/form/rich-text-editor";
import { TextArea } from "@moc/ui/components/form/text-area";
import { Button } from "@moc/ui/components/controls/button";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { ArrowLeft } from "lucide-react";
import {
    TEMPLATE_TOKENS,
    type MessageType,
    type TokenSpec,
} from "@moc/notifications";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { Page } from "@moc/ui/components/layout/page";
import { useMessageTemplateEditor } from "./use-message-template-editor";

export function MessageTemplateEditor({ messageType }: { messageType: MessageType }) {
    const { state, actions, templateMeta, textareaRef } = useMessageTemplateEditor(messageType);

    function renderSourceToken(token: TokenSpec) {
        return <Button.Unstyled key={token.name} type="button" data-token={token.name} onClick={actions.insertTokenFromButton} title={`Insert ${token.name}`} className="cursor-pointer rounded bg-secondary px-2 py-1 font-mono text-secondary hover:bg-tertiary focus-visible:outline-2 focus-visible:outline-offset-2"><Label.xs className="text-inherit">{`{{${token.name}}}`}</Label.xs></Button.Unstyled>;
    }
    function renderRichToken(token: TokenSpec) {
        return <RichTextEditor.Variable key={token.name} name={token.name} />;
    }

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

            <Page.Toolbar width="standard" className="justify-end">
                <SegmentedControl value={state.view} onValueChange={actions.changeView}>
                    <SegmentedControl.Item value="preview">Preview</SegmentedControl.Item>
                    <SegmentedControl.Item value="source">Source</SegmentedControl.Item>
                </SegmentedControl>
            </Page.Toolbar>

            <Page.Content width="standard" className="flex flex-col gap-3">
                {state.isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <>
                        {state.view === "source" ? (
                                <>
                                    <TextArea
                                        aria-label="Message template source"
                                        name="message-template-source"
                                        ref={textareaRef}
                                        value={state.body}
                                        onChange={actions.changeBody}
                                        rows={14}
                                        className="font-mono"
                                    />
                                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert a variable">
                                        <Label.xs className="mr-1 text-tertiary">Insert variable</Label.xs>
                                        {TEMPLATE_TOKENS[messageType].map(renderSourceToken)}
                                    </div>
                                </>
                            ) : (
                                state.unsupportedTags.length > 0 ? (
                                    <Paragraph.sm className="text-secondary">This template uses advanced blocks ({state.unsupportedTags.join(", ")}). Edit these in Source to preserve their formatting.</Paragraph.sm>
                                ) : (
                                    <RichTextEditor.Root value={state.editorHtml} onChange={actions.changeRichBody} disabled={state.saving}>
                                        <div>
                                            <RichTextEditor.Toolbar />
                                            <RichTextEditor.Content />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert a variable">
                                            <Label.xs className="mr-1 text-tertiary">Insert variable</Label.xs>
                                            {TEMPLATE_TOKENS[messageType].map(renderRichToken)}
                                        </div>
                                    </RichTextEditor.Root>
                                )
                            )}

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
