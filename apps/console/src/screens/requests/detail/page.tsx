import { useBreadcrumbOverride } from '@moc/ui/components/navigation/breadcrumb'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { Button } from '@moc/ui/components/controls/button'
import { Divider } from '@moc/ui/components/display/divider'
import { Header } from '@moc/ui/components/display/header'
import { Label, Title } from '@moc/ui/components/display/text'
import { DocEditor } from '@moc/ui/components/display/doc-editor/doc-editor'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { fetchAssigneesByRequestId, type ResolvedAssignee } from '@/data/fetch-assignees'
import type { Request } from '@moc/types/requests'
import { TopBarActions } from '@/features/topbar'
import { UnsavedChangesModal } from '@/features/requests/unsaved-changes-modal'
import { DeleteRequestModal } from '@/features/requests/delete-request-modal'
import { useRequests } from '@/features/requests/request-provider'
import { useRequestDetail } from '@/features/requests/use-request-detail'
import { Archive, ArchiveRestore, EllipsisVertical, Pencil, Trash2, Save, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RequestMetaFields, RequestFiveW, RequestNotes, RequestFlow, RequestAssigneeList } from '@/features/requests/request-properties'

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>();
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
    const { state: requestsState, actions: { loadRequest, syncRequest } } = useRequests();
    const request = id ? requestsState.requestsById[id] ?? null : null

    useBreadcrumbOverride(id ?? '', request?.title);

    useEffect(() => {
        if (!id) return;
        loadRequest(id);
        fetchAssigneesByRequestId(id).then(setAssignees);
    }, [id, loadRequest]);

    if (!request) {
        return (
            <section className="flex justify-center py-16 mx-auto max-w-content-sm">
                <Spinner size="lg" />
            </section>
        );
    }

    return (
        <RequestDetailContent
            request={request}
            assignees={assignees}
            setAssignees={setAssignees}
            syncRequest={syncRequest}
        />
    );
}

type RequestDetailContentProps = {
    request: Request;
    assignees: ResolvedAssignee[];
    setAssignees: (a: ResolvedAssignee[]) => void;
    syncRequest: (request: Request) => void;
};

function RequestDetailContent({ request, assignees, setAssignees, syncRequest }: RequestDetailContentProps) {
    const detail = useRequestDetail({ request, setAssignees, syncRequest });
    const { blockerState, isDeleting, showDeleteModal, store } = detail;
    const {
        closeDeleteModal,
        handleAddMember,
        handleArchiveToggle,
        handleBlockerCancel,
        handleBlockerDiscard,
        handleBlockerSave,
        handleContentChange,
        handleDelete,
        handleRemoveMember,
        handleSave,
        openDeleteModal,
    } = detail.actions;

    return (
        <section className="mx-auto max-w-content-md">
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
                <Dropdown placement="bottom">
                    <Dropdown.Trigger>
                        <Button.Icon variant="secondary" icon={<EllipsisVertical />} />
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
                        <Dropdown.Item onSelect={openDeleteModal}>
                            <Trash2 className="size-4 text-utility-red-600" />
                            <span className="text-utility-red-600">Delete</span>
                        </Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown>
            </TopBarActions>

            {/* Header */}
            <Header className='px-4 pt-12'>
                <Header.Lead className='gap-2'>
                    <Title.h5>{store.state.draft.title}</Title.h5>
                </Header.Lead>
            </Header>

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
            <RequestFiveW request={store.state.draft} className="p-4" />

            {/* Notes & Flow side by side when both present */}
            {(store.state.draft.notes) && (
                <>
                    <Divider className="px-4 my-2" />
                    <RequestNotes request={store.state.draft} className="p-4" />
                </>
            )}

            {/* Notes & Flow side by side when both present */}
            {(store.state.draft.flow) && (
                <>
                    <Divider className="px-4 my-2" />
                    <RequestFlow request={store.state.draft} className="p-4" />
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
                <DocEditor
                    value={store.state.draft.content ?? ''}
                    onChange={handleContentChange}
                    placeholder="Add notes, details, or any additional context here..."
                    className="w-full"
                />
            </div>

            {/* Navigation guard modal */}
            <UnsavedChangesModal open={blockerState === 'blocked'} onSave={handleBlockerSave} onDiscard={handleBlockerDiscard} onCancel={handleBlockerCancel} isSaving={store.state.isSaving} />

            {/* Delete confirmation modal */}
            <DeleteRequestModal open={showDeleteModal} onDelete={handleDelete} onCancel={closeDeleteModal} isDeleting={isDeleting} />

        </section>
    )
}
