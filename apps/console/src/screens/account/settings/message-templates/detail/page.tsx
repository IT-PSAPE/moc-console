import { Navigate, useParams } from "react-router-dom";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Divider } from "@moc/ui/components/display/divider";
import { Card } from "@moc/ui/components/display/card";
import { TextArea } from "@moc/ui/components/form/text-area";
import { Button } from "@moc/ui/components/controls/button";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { routes } from "@/screens/console-routes";
import {
    TEMPLATE_TOKENS,
    type MessageType,
} from "@moc/notifications";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { isMessageType } from "../meta";
import { PreviewText } from "../preview-text";
import { Page } from "@moc/ui/components/layout/page";
import { useMessageTemplateEditor } from "./use-message-template-editor";

const SETTINGS_TELEGRAM = `/${routes.settings}?tab=telegram`;

export function MessageTemplateDetailScreen() {
    const { messageType: raw } = useParams<{ messageType: string }>();
    const { role } = useWorkspace();
    const canManage = role?.can_manage_roles === true;

    if (!raw || !isMessageType(raw) || !canManage) {
        return <Navigate to={SETTINGS_TELEGRAM} replace />;
    }
    return <Editor messageType={raw} />;
}

function Editor({ messageType }: { messageType: MessageType }) {
    const { state, actions, templateMeta, textareaRef } = useMessageTemplateEditor(messageType);

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
                    <SegmentedControl.Item value="source">Source</SegmentedControl.Item>
                    <SegmentedControl.Item value="preview">Preview</SegmentedControl.Item>
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
                                    <div className="flex flex-wrap gap-1.5">
                                        {TEMPLATE_TOKENS[messageType].map((t) => (
                                            <Button.Unstyled
                                                key={t.name}
                                                type="button"
                                                data-token={t.name}
                                                onClick={actions.insertTokenFromButton}
                                                className="rounded bg-utility-gray-50 px-1.5 py-0.5 font-mono text-utility-gray-700 hover:bg-utility-gray-100"
                                            >
                                                <Label.xs className="text-inherit">{`{{ ${t.name} }}`}</Label.xs>
                                            </Button.Unstyled>
                                        ))}
                                    </div>
                                    {state.unknown.length > 0 && (
                                        <Paragraph.xs className="text-utility-red-700">
                                            Unknown placeholder{state.unknown.length > 1 ? "s" : ""} for this
                                            message: {state.unknown.map((unknownToken) => `{{${unknownToken}}}`).join(", ")}
                                        </Paragraph.xs>
                                    )}
                                </>
                            ) : (
                                <Card.Content className="bg-secondary p-3">
                                    <PreviewText text={state.preview} />
                                </Card.Content>
                            )}

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
