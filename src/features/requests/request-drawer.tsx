import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Divider } from "@/components/display/divider";
import { Button } from "@/components/controls/button";
import { Title } from "@/components/display/text";
import { fetchAssigneesByRequestId, type ResolvedAssignee } from "@/data/fetch-assignees";
import { addRequestAssignee } from "@/data/mutate-requests";
import { useFeedback } from "@/components/feedback/feedback-provider";
import type { Request } from "@/types/requests";
import { useRequestStore } from "./use-request-store";
import { UnsavedChangesModal } from "./unsaved-changes-modal";
import { Archive, ArchiveRestore, EllipsisVertical, Maximize2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { RequestMetaFields, RequestFiveW, RequestNotes, RequestFlow, RequestAssigneeList } from "./request-properties";

export type RequestDrawerProps = {
    request: Request;
    onRequestClose?: () => void;
    isDirtyRef?: RefObject<boolean>;
    requestCloseRef?: RefObject<(() => void) | null>;
};

export function RequestDrawer({ request, onRequestClose, isDirtyRef, requestCloseRef }: RequestDrawerProps) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="!max-w-lg">
                <RequestDrawerContent
                    request={request}
                    onRequestClose={onRequestClose}
                    isDirtyRef={isDirtyRef}
                    requestCloseRef={requestCloseRef}
                />
            </Drawer.Panel>
        </Drawer.Portal>
    );
}

function RequestDrawerContent({ request, onRequestClose, isDirtyRef, requestCloseRef }: RequestDrawerProps) {
    const { state: drawerState } = useDrawer();
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const store = useRequestStore(request);

    // Sync dirty state to parent ref so RequestItem can intercept close
    useEffect(() => {
        if (isDirtyRef) isDirtyRef.current = store.state.isDirty;
    }, [isDirtyRef, store.state.isDirty]);

    // Register the "request close with modal" handler on the parent ref
    useEffect(() => {
        if (requestCloseRef) {
            requestCloseRef.current = () => setShowUnsavedModal(true);
        }
        return () => {
            if (requestCloseRef) requestCloseRef.current = null;
        };
    }, [requestCloseRef]);

    useEffect(() => {
        if (!drawerState.isOpen) return;
        fetchAssigneesByRequestId(request.id).then(setAssignees);
    }, [drawerState.isOpen, request.id]);

    function handleOpenFullPage() {
        if (store.state.isDirty) {
            setShowUnsavedModal(true);
            return;
        }
        onRequestClose?.();
        navigate(`/requests/${request.id}`);
    }

    const handleClose = useCallback(() => {
        if (store.state.isDirty) {
            setShowUnsavedModal(true);
            return;
        }
        onRequestClose?.();
    }, [store.state.isDirty, onRequestClose]);

    async function handleAddMember(assigneeId: string, duty: string) {
        try {
            await addRequestAssignee(request.id, assigneeId, duty);
            const updated = await fetchAssigneesByRequestId(request.id);
            setAssignees(updated);
        } catch {
            toast({ title: "Failed to add member", variant: "error" });
        }
    }

    const handleSave = useCallback(async () => {
        try {
            await store.actions.save();
            toast({ title: 'Request saved', variant: 'success' });
        } catch {
            toast({ title: 'Failed to save request', variant: 'error' });
        }
    }, [store.actions, toast]);

    // Modal actions
    async function handleModalSave() {
        try {
            await store.actions.save();
            toast({ title: 'Request saved', variant: 'success' });
            setShowUnsavedModal(false);
            onRequestClose?.();
        } catch {
            toast({ title: 'Failed to save request', variant: 'error' });
        }
    }

    function handleModalDiscard() {
        store.actions.discard();
        setShowUnsavedModal(false);
        onRequestClose?.();
    }

    function handleModalCancel() {
        setShowUnsavedModal(false);
    }

    return (
        <>
            {/* Toolbar */}
            <Drawer.Header className="flex items-center gap-1">
                <button type="button" onClick={handleClose}>
                    <Button variant="ghost" icon={<X />} iconOnly />
                </button>
                <Button variant="ghost" icon={<Maximize2 />} iconOnly onClick={handleOpenFullPage} />
                <div className="flex-1" />
                <Dropdown.Root placement="bottom">
                    <Dropdown.Trigger>
                        <Button variant="ghost" icon={<EllipsisVertical />} iconOnly />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={() => { }}>
                            {request.status === "archived" ? (
                                <><ArchiveRestore className="size-4" />Unarchive</>
                            ) : (
                                <><Archive className="size-4" />Archive</>
                            )}
                        </Dropdown.Item>
                        <Dropdown.Separator />
                        <Dropdown.Item onSelect={() => { }}>
                            <Trash2 className="size-4 text-utility-red-600" />
                            <span className="text-utility-red-600">Delete</span>
                        </Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown.Root>
            </Drawer.Header>

            <Drawer.Content className="py-4">
                <div className="px-4 pb-4">
                    <Title.h6>{store.state.draft.title}</Title.h6>
                </div>

                <div className="px-4">
                    <RequestMetaFields
                        request={store.state.draft}
                        assignees={assignees}
                        onAddMember={handleAddMember}
                        editable
                        onFieldChange={store.actions.updateField}
                    />
                </div>

                <>
                    <Divider className="px-4 py-6" />
                    <RequestFiveW request={store.state.draft} className="px-4" />
                </>

                {store.state.draft.notes && (
                    <>
                        <Divider className="px-4 py-6" />
                        <RequestNotes request={store.state.draft} className="px-4" />
                    </>
                )}

                {store.state.draft.flow && (
                    <>
                        <Divider className="px-4 py-6" />
                        <RequestFlow request={store.state.draft} className="px-4" />
                    </>
                )}

                {assignees.length > 0 && (
                    <>
                        <Divider className="px-4 py-6" />
                        <RequestAssigneeList assignees={assignees} className="px-4" />
                    </>
                )}
            </Drawer.Content>

            {/* Save footer — visible only when dirty */}
            {store.state.isDirty && (
                <Drawer.Footer className="justify-end">
                    <Button variant="ghost" onClick={store.actions.discard}>Discard</Button>
                    <Button onClick={handleSave} disabled={store.state.isSaving}>
                        {store.state.isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </Drawer.Footer>
            )}

            {/* Unsaved changes modal */}
            <UnsavedChangesModal
                open={showUnsavedModal}
                onSave={handleModalSave}
                onDiscard={handleModalDiscard}
                onCancel={handleModalCancel}
                isSaving={store.state.isSaving}
            />
        </>
    );
}
