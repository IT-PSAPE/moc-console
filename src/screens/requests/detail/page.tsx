import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Dropdown } from '@/components/overlays/dropdown'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { fetchAssigneesByRequestId, type ResolvedAssignee } from '@/data/fetch-assignees'
import { addRequestAssignee, removeRequestAssignee, archiveRequest, unarchiveRequest, deleteRequest } from '@/data/mutate-requests'
import type { Request } from '@/types/requests'
import { TopBarActions } from '@/features/topbar'
import { useRequestStore } from '@/features/requests/use-request-store'
import { UnsavedChangesModal } from '@/features/requests/unsaved-changes-modal'
import { DeleteRequestModal } from '@/features/requests/delete-request-modal'
import { useRequests } from '@/features/requests/request-provider'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { Archive, ArchiveRestore, EllipsisVertical, Pencil, Trash2, Save, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { RequestMetaFields, RequestFiveW, RequestNotes, RequestFlow, RequestAssigneeList } from '@/features/requests/request-properties'

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>();
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
    const { state: requestsState, actions: { loadRequest, syncRequest } } = useRequests();
    const { toast } = useFeedback();
    const request = id ? requestsState.requestsById[id] ?? null : null

    useBreadcrumbOverride(id ?? '', request?.title);

    useEffect(() => {
        if (!id) return;
        loadRequest(id);
        fetchAssigneesByRequestId(id).then(setAssignees);
    }, [id, loadRequest]);

    if (!request) {
        return (
            <section className="p-4 pt-8 mx-auto max-w-content-sm">
                <Paragraph.sm className="text-tertiary">Loading...</Paragraph.sm>
            </section>
        );
    }

    return (
        <RequestDetailContent
            request={request}
            assignees={assignees}
            setAssignees={setAssignees}
            toast={toast}
            syncRequest={syncRequest}
        />
    );
}

type RequestDetailContentProps = {
    request: Request;
    assignees: ResolvedAssignee[];
    setAssignees: (a: ResolvedAssignee[]) => void;
    toast: (options: { title: string; variant?: 'error' | 'warning' | 'success' | 'info' | 'feature' }) => string;
    syncRequest: (request: Request) => void;
};

function RequestDetailContent({ request, assignees, setAssignees, toast, syncRequest }: RequestDetailContentProps) {
    const navigate = useNavigate();
    const { actions: { removeRequest } } = useRequests();
    const store = useRequestStore(request, { syncRequest });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Navigation guard
    const blocker = useBlocker(store.state.isDirty);

    // Browser close/refresh guard
    useEffect(() => {
        if (!store.state.isDirty) return;

        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [store.state.isDirty]);

    async function handleAddMember(userId: string, duty: string) {
        try {
            await addRequestAssignee(request.id, userId, duty);
            const updated = await fetchAssigneesByRequestId(request.id);
            setAssignees(updated);
        } catch {
            toast({ title: "Failed to add member", variant: "error" });
        }
    }

    async function handleRemoveMember(userId: string) {
        try {
            await removeRequestAssignee(request.id, userId);
            const updated = await fetchAssigneesByRequestId(request.id);
            setAssignees(updated);
        } catch {
            toast({ title: "Failed to remove member", variant: "error" });
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

    // Handle blocker modal actions
    async function handleBlockerSave() {
        try {
            await store.actions.save();
            toast({ title: 'Request saved', variant: 'success' });
            if (blocker.state === 'blocked') blocker.proceed();
        } catch {
            toast({ title: 'Failed to save request', variant: 'error' });
        }
    }

    function handleBlockerDiscard() {
        store.actions.discard();
        if (blocker.state === 'blocked') blocker.proceed();
    }

    function handleBlockerCancel() {
        if (blocker.state === 'blocked') blocker.reset();
    }

    async function handleArchiveToggle() {
        try {
            if (request.status === "archived") {
                await unarchiveRequest(request.id);
                syncRequest({ ...request, status: "not_started" });
                toast({ title: "Request unarchived", variant: "success" });
            } else {
                await archiveRequest(request.id);
                syncRequest({ ...request, status: "archived" });
                toast({ title: "Request archived", variant: "success" });
            }
        } catch {
            toast({ title: "Failed to update request", variant: "error" });
        }
    }

    async function handleDelete() {
        setIsDeleting(true);
        try {
            await deleteRequest(request.id);
            removeRequest(request.id);
            toast({ title: "Request deleted", variant: "success" });
            setShowDeleteModal(false);
            navigate("/requests/all-requests");
        } catch {
            toast({ title: "Failed to delete request", variant: "error" });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="mx-auto max-w-content-sm">
            <TopBarActions>
                {store.state.isDirty ? (
                    <>
                        <Button variant='ghost' icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
                        <Button icon={<Save />} onClick={handleSave} disabled={store.state.isSaving}>
                            {store.state.isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                ) : (
                    <Button variant='secondary' icon={<Pencil />}>Edit</Button>
                )}
                <Dropdown.Root placement="bottom">
                    <Dropdown.Trigger>
                        <Button variant="secondary" icon={<EllipsisVertical />} iconOnly />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={handleArchiveToggle}>
                            {request.status === "archived" ? (
                                <><ArchiveRestore className="size-4" />Unarchive</>
                            ) : (
                                <><Archive className="size-4" />Archive</>
                            )}
                        </Dropdown.Item>
                        <Dropdown.Separator />
                        <Dropdown.Item onSelect={() => setShowDeleteModal(true)}>
                            <Trash2 className="size-4 text-utility-red-600" />
                            <span className="text-utility-red-600">Delete</span>
                        </Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown.Root>
            </TopBarActions>

            {/* Header */}
            <Header.Root className='px-4 pt-12'>
                <Header.Lead className='gap-2'>
                    <Title.h5>{store.state.draft.title}</Title.h5>
                </Header.Lead>
            </Header.Root>

            {/* Properties */}
            <div className="p-4">
                <RequestMetaFields
                    request={store.state.draft}
                    editable
                    onFieldChange={store.actions.updateField}
                />
            </div>

            <Divider className="px-4 my-2" />

            {/* 5W1H */}
            <div className="p-4">
                <RequestFiveW request={store.state.draft} />
            </div>

            {/* Notes & Flow side by side when both present */}
            {(store.state.draft.notes || store.state.draft.flow) && (
                <>
                    <Divider className="px-4 my-2" />
                    <div className="p-4 grid grid-cols-2 gap-8">
                        <RequestNotes request={store.state.draft} />
                        <RequestFlow request={store.state.draft} />
                    </div>
                </>
            )}

            {/* Assignees */}
            <Divider className="px-4 my-2" />
            <div className="p-4">
                <RequestAssigneeList
                    assignees={assignees}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                />
            </div>

            {/* Content area */}
            <Divider className="px-4 my-2" />
            <div className="p-4">
                <Label.md className="block pb-3">Content</Label.md>
                <textarea
                    className="w-full min-h-64 rounded-lg border border-secondary bg-primary p-4 text-sm text-primary placeholder:text-quaternary outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
                    placeholder="Add notes, details, or any additional context here..."
                    value={store.state.draft.content ?? ''}
                    onChange={(e) => store.actions.updateField('content', e.target.value)}
                />
            </div>

            {/* Navigation guard modal */}
            <UnsavedChangesModal
                open={blocker.state === 'blocked'}
                onSave={handleBlockerSave}
                onDiscard={handleBlockerDiscard}
                onCancel={handleBlockerCancel}
                isSaving={store.state.isSaving}
            />

            {/* Delete confirmation modal */}
            <DeleteRequestModal
                open={showDeleteModal}
                onDelete={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                isDeleting={isDeleting}
            />

        </section>
    )
}
