import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Dropdown } from '@/components/overlays/dropdown'
import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { fetchRequestById } from '@/data/fetch-requests'
import { fetchAssigneesByRequestId, type ResolvedAssignee } from '@/data/fetch-assignees'
import type { Request } from '@/types/requests'
import {
    Archive,
    ArchiveRestore,
    ArrowLeft,
    EllipsisVertical,
    Pencil,
    Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    RequestMetaFields,
    RequestFiveW,
    RequestNotes,
    RequestFlow,
    RequestAssigneeList,
} from '@/features/requests/request-properties'

export function RequestDetailScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<Request | null>(null);
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);
    const [content, setContent] = useState('');

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
        <section className="mx-auto max-w-content-sm">
            {/* Header */}
            <Header.Root className='p-4 pt-8'>
                <Header.Lead className='gap-2'>
                    <Button variant='ghost' icon={<ArrowLeft />} iconOnly onClick={() => navigate(-1)} />
                    <Title.h6>{request.title}</Title.h6>
                </Header.Lead>
                <Header.Trail className='gap-2'>
                    <Button variant='secondary' icon={<Pencil />}>Edit</Button>
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
                </Header.Trail>
            </Header.Root>

            {/* Properties */}
            <div className="p-4 pt-8">
                <RequestMetaFields request={request} assignees={assignees} />
            </div>

            <Divider className="px-4 my-2" />

            {/* 5W1H */}
            <div className="p-4">
                <RequestFiveW request={request} />
            </div>

            {/* Notes & Flow side by side when both present */}
            {(request.notes || request.flow) && (
                <>
                    <Divider className="px-4 my-2" />
                    <div className="p-4 grid grid-cols-2 gap-8">
                        <RequestNotes request={request} />
                        <RequestFlow request={request} />
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

            {/* Content area — Notion-style */}
            <Divider className="px-4 my-2" />
            <div className="p-4">
                <Label.md className="pb-3">Content</Label.md>
                <textarea
                    className="w-full min-h-64 rounded-lg border border-secondary bg-primary p-4 text-sm text-primary placeholder:text-quaternary outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
                    placeholder="Add notes, details, or any additional context here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
        </section>
    )
}
