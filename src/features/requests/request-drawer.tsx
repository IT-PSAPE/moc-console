import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Divider } from "@/components/display/divider";
import { Button } from "@/components/controls/button";
import { Title } from "@/components/display/text";
import { fetchAssigneesByRequestId, type ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request } from "@/types/requests";
import {
    Archive,
    ArchiveRestore,
    EllipsisVertical,
    Maximize2,
    Pencil,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    RequestMetaFields,
    RequestFiveW,
    RequestNotes,
    RequestFlow,
    RequestAssigneeList,
} from "./request-properties";

export function RequestDrawer({ request }: { request: Request }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <RequestDrawerContent request={request} />
            </Drawer.Panel>
        </Drawer.Portal>
    );
}

function RequestDrawerContent({ request }: { request: Request }) {
    const { state, actions } = useDrawer();
    const navigate = useNavigate();
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);

    useEffect(() => {
        if (!state.isOpen) return;
        fetchAssigneesByRequestId(request.id).then(setAssignees);
    }, [state.isOpen, request.id]);

    function handleOpenFullPage() {
        actions.close();
        navigate(`/requests/${request.id}`);
    }

    return (
        <>
            {/* Toolbar */}
            <Drawer.Header className="flex items-center gap-1">
                <Drawer.Close>
                    <Button variant="ghost" icon={<X />} iconOnly />
                </Drawer.Close>
                <Button variant="ghost" icon={<Maximize2 />} iconOnly onClick={handleOpenFullPage} />
                <div className="flex-1" />
                <Dropdown.Root placement="bottom">
                    <Dropdown.Trigger>
                        <Button variant="ghost" icon={<EllipsisVertical />} iconOnly />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={() => { }}>
                            <Pencil className="size-4" />
                            Edit
                        </Dropdown.Item>
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
                    <Title.h6>{request.title}</Title.h6>
                </div>

                <div className="px-4">
                    <RequestMetaFields request={request} assignees={assignees} />
                </div>

                <Divider className="px-4 py-6" />

                <div className="px-4">
                    <RequestFiveW request={request} />
                </div>

                <Divider className="px-4 py-6" />

                <div className="px-4">
                    <RequestNotes request={request} />
                </div>

                {request.flow && (
                    <>
                        <Divider className="px-4 py-6" />
                        <div className="px-4">
                            <RequestFlow request={request} />
                        </div>
                    </>
                )}

                {assignees.length > 0 && (
                    <>
                        <Divider className="px-4 py-6" />
                        <div className="px-4">
                            <RequestAssigneeList assignees={assignees} />
                        </div>
                    </>
                )}
            </Drawer.Content>
        </>
    );
}
