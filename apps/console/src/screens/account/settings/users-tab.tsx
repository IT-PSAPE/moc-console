import { Badge } from "@moc/ui/components/display/badge";
import { DataTable } from "@moc/ui/components/display/data-table";
import { Section } from "@moc/ui/components/display/section";
import { Input } from "@moc/ui/components/form/input";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";
import { UsersProvider, useUsers } from "@/features/users/users-provider";
import type { UserWithRole } from "@moc/data/fetch-users";
import { Check, ChevronDown, MessagesSquare, Search, Shield } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { Divider } from "@moc/ui/components/display/divider";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";

const roleColor: Record<string, "blue" | "purple" | "green" | "gray"> = {
    admin: "purple",
    editor: "blue",
    viewer: "green",
};

function getRoleColor(name: string | undefined) {
    if (!name) return "gray" as const;
    return roleColor[name.toLowerCase()] ?? ("gray" as const);
}

export function UsersTab() {
    return (
        <UsersProvider>
            <UsersTabContent />
        </UsersProvider>
    );
}

function UsersTabContent() {
    const { role, profile } = useAuth();
    const {
        state: { users, roles, isLoading },
        actions: { loadUsers, changeRole },
    } = useUsers();
    const { currentWorkspaceId } = useWorkspace();
    const { toast } = useFeedback();

    const [search, setSearch] = useState("");

    const canManage = role?.can_manage_roles === true;
    const currentUserId = profile?.id;

    const handleRoleChange = useCallback(
        async (userId: string, roleId: string) => {
            try {
                await changeRole(userId, roleId);
                toast({ title: "Role updated", variant: "success" });
            } catch (err) {
                toast({
                    title: "Couldn't update role",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "error",
                });
            }
        },
        [changeRole, toast],
    );

    const columns = useMemo(() => [
        {
            key: "name",
            header: "Name",
            render: (_: unknown, row: UserWithRole) => (
                <span className="flex items-center gap-3">
                    <UserAvatar user={row} size="sm" />
                    <span className="flex items-center gap-2 text-primary">
                        {row.name} {row.surname}
                        {row.id === currentUserId && <Badge label="You" color="blue" />}
                    </span>
                </span>
            ),
        },
        {
            key: "email",
            header: "Email",
            render: (_: unknown, row: UserWithRole) => (
                <span className="text-tertiary">{row.email}</span>
            ),
        },
        {
            key: "role",
            header: "Role",
            render: (_: unknown, row: UserWithRole) => {
                const roleName = row.role?.name ?? "No role";

                if (!canManage) {
                    return (
                        <Badge
                            label={roleName}
                            color={getRoleColor(row.role?.name)}
                            icon={<Shield />}
                        />
                    );
                }

                return (
                    <Dropdown placement="bottom">
                        <Dropdown.Trigger
                            onClick={(event: MouseEvent<HTMLSpanElement>) => event.stopPropagation()}
                            className="inline-flex w-fit min-w-36 items-center justify-between gap-2 rounded-lg border border-secondary bg-primary py-1.5 px-2.5 cursor-pointer paragraph-sm"
                        >
                            <span className="flex items-center gap-1.5">
                                <Shield className="size-4 text-tertiary" />
                                <span className="capitalize text-primary">{roleName}</span>
                            </span>
                            <ChevronDown className="size-4 text-tertiary" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {roles.map((r) => {
                                const isSelected = r.id === row.role?.id;
                                return (
                                    <Dropdown.Item
                                        key={r.id}
                                        onSelect={() => {
                                            if (!isSelected) {
                                                void handleRoleChange(row.id, r.id);
                                            }
                                        }}
                                    >
                                        <span className="size-4 shrink-0 flex items-center justify-center">
                                            {isSelected && <Check className="size-3.5 text-brand_secondary" />}
                                        </span>
                                        <span className="capitalize">{r.name}</span>
                                    </Dropdown.Item>
                                );
                            })}
                        </Dropdown.Panel>
                    </Dropdown>
                );
            },
        },
        {
            key: "telegram",
            header: "Telegram",
            render: (_: unknown, row: UserWithRole) =>
                row.telegramChatId ? (
                    <Badge label="Connected" color="green" icon={<MessagesSquare />} />
                ) : (
                    <Badge label="Not connected" color="gray" variant="outline" />
                ),
        },
    ], [canManage, currentUserId, handleRoleChange, roles]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    }, []);

    const filtered = useMemo(() => {
        const workspaceScopedUsers = currentWorkspaceId
            ? users.filter((user) => user.workspaceIds.includes(currentWorkspaceId))
            : users;

        if (!search.trim()) return workspaceScopedUsers;
        const q = search.toLowerCase();
        return workspaceScopedUsers.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                u.surname.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                (u.role?.name ?? "").toLowerCase().includes(q),
        );
    }, [currentWorkspaceId, search, users]);

    return (
        <Section>
            <Section.Header title="Members" />

            <Divider className="py-6" />

            <Section.Body className="gap-4">
                <div className="flex flex-1 justify-end">
                    <Input icon={<Search />} placeholder="Search users..." className="w-full max-w-md" value={search} onChange={handleSearchChange} />
                </div>
                {isLoading ? (
                    <LoadingSpinner className="py-16" />
                ) : (
                    <DataTable
                        data={filtered}
                        columns={columns}
                        emptyMessage="No users match your search"
                        className="rounded-lg border border-secondary overflow-hidden"
                    />
                )}
            </Section.Body>
        </Section>
    );
}
