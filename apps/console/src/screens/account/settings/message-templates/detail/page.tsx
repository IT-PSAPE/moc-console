import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useBlocker, useNavigate, useParams } from "react-router-dom";
import { Header } from "@moc/ui/components/display/header";
import { Title, Label, Paragraph } from "@moc/ui/components/display/text";
import { Card } from "@moc/ui/components/display/card";
import { Divider } from "@moc/ui/components/display/divider";
import { TextArea } from "@moc/ui/components/form/text-area";
import { Button } from "@moc/ui/components/controls/button";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { routes } from "@/screens/console-routes";
import {
    DEFAULT_TEMPLATES,
    SAMPLE_TOKENS,
    TEMPLATE_TOKENS,
    renderTemplate,
    validateTemplate,
    type MessageType,
} from "@/data/notification-templates-core";
import {
    deleteNotificationTemplate,
    fetchNotificationTemplates,
    upsertNotificationTemplate,
} from "@/data/notification-templates";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { isMessageType, messageTypeMeta } from "../meta";
import { PreviewText } from "../preview-text";

const SETTINGS_TELEGRAM = `/${routes.settings}?tab=telegram`;

export function MessageTemplateDetailScreen() {
    const { messageType: raw } = useParams<{ messageType: string }>();
    const { role } = useAuth();
    const canManage = role?.can_manage_roles === true;

    if (!raw || !isMessageType(raw) || !canManage) {
        return <Navigate to={SETTINGS_TELEGRAM} replace />;
    }
    return <Editor messageType={raw} />;
}

function Editor({ messageType }: { messageType: MessageType }) {
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const { currentWorkspaceId } = useWorkspace();
    const meta = messageTypeMeta(messageType);
    const defaultBody = DEFAULT_TEMPLATES[messageType];

    const [isLoading, setIsLoading] = useState(true);
    const [hasCustom, setHasCustom] = useState(false);
    const [savedBody, setSavedBody] = useState<string | null>(null); // null = on default
    const [body, setBody] = useState(defaultBody);
    const [view, setView] = useState<"source" | "preview">("source");
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!currentWorkspaceId) return;
        let cancelled = false;
        setIsLoading(true);
        void (async () => {
            try {
                const rows = await fetchNotificationTemplates(currentWorkspaceId);
                if (cancelled) return;
                const row = rows.find((r) => r.messageType === messageType);
                setHasCustom(!!row);
                setSavedBody(row ? row.body : null);
                setBody(row ? row.body : defaultBody);
            } catch (error) {
                if (!cancelled) {
                    toast({
                        title: "Couldn't load template",
                        description: error instanceof Error ? error.message : "Unknown error",
                        variant: "error",
                    });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [currentWorkspaceId, messageType, defaultBody, toast]);

    const unknown = useMemo(() => validateTemplate(messageType, body), [messageType, body]);
    const preview = useMemo(
        () => renderTemplate(body, SAMPLE_TOKENS[messageType]),
        [messageType, body],
    );

    const dirty = body !== (savedBody ?? defaultBody);
    const canSave = dirty && unknown.length === 0 && body.trim() !== "" && !saving;

    // Block in-app navigation (incl. the back button) while dirty.
    const blocker = useBlocker(dirty);

    // Guard browser refresh / tab close while dirty.
    useEffect(() => {
        if (!dirty) return;
        function onBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
        }
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty]);

    const insertToken = useCallback(
        (name: string) => {
            const el = textareaRef.current;
            const token = `{{${name}}}`;
            if (!el) {
                setBody((b) => b + token);
                return;
            }
            const start = el.selectionStart ?? body.length;
            const end = el.selectionEnd ?? body.length;
            setBody(body.slice(0, start) + token + body.slice(end));
            requestAnimationFrame(() => {
                el.focus();
                const caret = start + token.length;
                el.setSelectionRange(caret, caret);
            });
        },
        [body],
    );

    const handleSave = useCallback(async (): Promise<boolean> => {
        if (!currentWorkspaceId) return false;
        setSaving(true);
        try {
            await upsertNotificationTemplate({
                workspaceId: currentWorkspaceId,
                scope: meta.scope,
                messageType,
                body,
            });
            setSavedBody(body);
            setHasCustom(true);
            toast({ title: "Template saved", variant: "success" });
            return true;
        } catch (error) {
            toast({
                title: "Couldn't save template",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "error",
            });
            return false;
        } finally {
            setSaving(false);
        }
    }, [currentWorkspaceId, meta.scope, messageType, body, toast]);

    const handleBlockerSave = useCallback(async () => {
        const ok = await handleSave();
        if (ok && blocker.state === "blocked") blocker.proceed();
    }, [handleSave, blocker]);

    const handleBlockerDiscard = useCallback(() => {
        setBody(savedBody ?? defaultBody);
        if (blocker.state === "blocked") blocker.proceed();
    }, [blocker, savedBody, defaultBody]);

    const handleBlockerCancel = useCallback(() => {
        if (blocker.state === "blocked") blocker.reset();
    }, [blocker]);

    const handleRestore = useCallback(async () => {
        if (!currentWorkspaceId) return;
        setSaving(true);
        try {
            await deleteNotificationTemplate({
                workspaceId: currentWorkspaceId,
                scope: meta.scope,
                messageType,
            });
            setSavedBody(null);
            setHasCustom(false);
            setBody(defaultBody);
            toast({ title: "Default restored", variant: "success" });
        } catch (error) {
            toast({
                title: "Couldn't restore default",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "error",
            });
        } finally {
            setSaving(false);
        }
    }, [currentWorkspaceId, meta.scope, messageType, defaultBody, toast]);

    return (
        <section className="mx-auto max-w-content-md">
            <Header className="p-4 pt-8">
                <Header.Lead className="gap-1">
                    <button
                        type="button"
                        onClick={() => navigate(SETTINGS_TELEGRAM)}
                        className="flex items-center gap-1 text-tertiary hover:text-primary"
                    >
                        <ArrowLeft className="size-4" />
                        <Label.xs className="text-inherit">Message templates</Label.xs>
                    </button>
                    <Title.h6 className="pt-2">{meta.label}</Title.h6>
                    <Paragraph.xs className="text-tertiary pt-1">{meta.description}</Paragraph.xs>
                </Header.Lead>
            </Header>

            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <Card>
                        <Card.Header tight>
                            <div className="flex flex-1 flex-col gap-0.5">
                                <Label.sm>Body</Label.sm>
                                <Paragraph.xs className="text-quaternary">
                                    {hasCustom ? "Custom template" : "Using built-in default"}
                                </Paragraph.xs>
                            </div>
                            <SegmentedControl
                                value={view}
                                onValueChange={(v) => setView(v as "source" | "preview")}
                            >
                                <SegmentedControl.Item value="source">Source</SegmentedControl.Item>
                                <SegmentedControl.Item value="preview">Preview</SegmentedControl.Item>
                            </SegmentedControl>
                        </Card.Header>
                        <Card.Content className="flex flex-col gap-3 p-3">
                            {view === "source" ? (
                                <>
                                    <TextArea
                                        ref={textareaRef}
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        resize="vertical"
                                        rows={14}
                                        className="font-mono"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {TEMPLATE_TOKENS[messageType].map((t) => (
                                            <button
                                                key={t.name}
                                                type="button"
                                                onClick={() => insertToken(t.name)}
                                                className="rounded bg-utility-gray-50 px-1.5 py-0.5 font-mono text-utility-gray-700 hover:bg-utility-gray-100"
                                            >
                                                <Label.xs className="text-inherit">{`{{ ${t.name} }}`}</Label.xs>
                                            </button>
                                        ))}
                                    </div>
                                    {unknown.length > 0 && (
                                        <Paragraph.xs className="text-utility-red-700">
                                            Unknown placeholder{unknown.length > 1 ? "s" : ""} for this
                                            message: {unknown.map((u) => `{{${u}}}`).join(", ")}
                                        </Paragraph.xs>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-lg border border-tertiary bg-secondary p-3">
                                    <PreviewText text={preview} />
                                </div>
                            )}

                            <Divider />

                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    disabled={saving || !hasCustom}
                                    onClick={handleRestore}
                                >
                                    Restore default
                                </Button>
                                <Button variant="primary" disabled={!canSave} onClick={handleSave}>
                                    Save changes
                                </Button>
                            </div>
                        </Card.Content>
                    </Card>
                )}
            </div>

            <UnsavedChangesModal
                open={blocker.state === "blocked"}
                onSave={handleBlockerSave}
                onDiscard={handleBlockerDiscard}
                onCancel={handleBlockerCancel}
                isSaving={saving}
                message="You have unsaved changes to this template. Save them before leaving, or discard to continue."
            />
        </section>
    );
}
