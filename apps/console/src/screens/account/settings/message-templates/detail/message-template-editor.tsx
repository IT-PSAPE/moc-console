import { Link } from "react-router-dom";
import { Header } from "@moc/ui/components/display/header";
import { Paragraph } from "@moc/ui/components/display/text";
import { Divider } from "@moc/ui/components/display/divider";
import { VariableTextEditor } from "@moc/ui/components/form/variable-text-editor";
import { Button } from "@moc/ui/components/controls/button";
import {
    type MessageType,
} from "@moc/notifications";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { Page } from "@moc/ui/components/layout/page";
import { DetailPage } from "@moc/ui/components/layout/detail-page";
import { ResourceLoadError } from "@/components/feedback/resource-load-error";
import { MESSAGE_TEMPLATES_PATH } from "../meta";
import { useMessageTemplateEditor } from "./use-message-template-editor";

export function MessageTemplateEditor({ messageType }: { messageType: MessageType }) {
    const { state, actions, templateMeta, textareaRef, variables } = useMessageTemplateEditor(messageType);

    if (state.isLoading) return <Page.Loading />;

    return (
        <DetailPage>
            <DetailPage.Back render={<Link to={MESSAGE_TEMPLATES_PATH} />}>Message templates</DetailPage.Back>

            <DetailPage.Header>
                <Header.Lead>
                    <Page.Title>{templateMeta.label}</Page.Title>
                </Header.Lead>
            </DetailPage.Header>

            <DetailPage.Section>
                {state.loadError ? <ResourceLoadError title="Couldn't load template" error={state.loadError} onRetry={actions.retryLoad} /> : (
                    <div className="flex flex-col gap-3">
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
                    </div>
                )}
            </DetailPage.Section>

            {!state.loadError && <UnsavedChangesModal
                open={state.navigationBlocked}
                onSave={actions.saveAndProceed}
                onDiscard={actions.discardAndProceed}
                onCancel={actions.cancelNavigation}
                isSaving={state.saving}
                message="You have unsaved changes to this template. Save them before leaving, or discard to continue."
            />}
        </DetailPage>
    );
}
