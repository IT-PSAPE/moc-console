import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Dropdown } from '@/components/overlays/dropdown'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { fetchRequestById } from '@/data/fetch-requests'
import { fetchAllAssignees, fetchAssigneesByRequestId, type ResolvedAssignee } from '@/data/fetch-assignees'
import type { Request } from '@/types/requests'
import { TopBarActions } from '@/features/topbar'
import { useRequestStore } from '@/features/requests/use-request-store'
import { UnsavedChangesModal } from '@/features/requests/unsaved-changes-modal'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { Archive, ArchiveRestore, EllipsisVertical, Pencil, Trash2, Save, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useParams } from 'react-router-dom'
import { RequestMetaFields, RequestFiveW, RequestNotes, RequestFlow, RequestAssigneeList } from '@/features/requests/request-properties'

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<Request | null>(null);
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
    const { toast } = useFeedback();

    useBreadcrumbOverride(id ?? '', request?.title);

    useEffect(() => {
        if (!id) return;
        fetchRequestById(id).then((r) => {
            if (r) setRequest(r);
        });
        fetchAssigneesByRequestId(id).then(setAssignees);
    }, [id]);

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
        />
    );
}

type RequestDetailContentProps = {
    request: Request;
    assignees: ResolvedAssignee[];
    setAssignees: (a: ResolvedAssignee[]) => void;
    toast: (options: { title: string; variant?: 'error' | 'warning' | 'success' | 'info' | 'feature' }) => string;
};

function RequestDetailContent({ request, assignees, setAssignees, toast }: RequestDetailContentProps) {
    const store = useRequestStore(request);

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

    function handleAddMember(assigneeId: string, duty: string) {
        // TODO: persist to Supabase, then refetch
        // Optimistically add to local state
        fetchAllAssignees().then((all) => {
            const match = all.find((a) => a.id === assigneeId);
            if (match) {
                setAssignees([...assignees, { ...match, duty }]);
            }
        });
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
                    assignees={assignees}
                    onAddMember={handleAddMember}
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
            {assignees.length > 0 && (
                <>
                    <Divider className="px-4 my-2" />
                    <div className="p-4">
                        <RequestAssigneeList assignees={assignees} />
                    </div>
                </>
            )}

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

        </section>
    )
}
