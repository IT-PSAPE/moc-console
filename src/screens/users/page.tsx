import { Badge } from "@/components/display/badge";
import { Card } from "@/components/display/card";
import { DataTable } from "@/components/display/data-table";
import { Decision } from "@/components/display/decision";
import { Header } from "@/components/display/header";
import { MetaRow } from "@/components/display/meta-row";
import { Paragraph, Title } from "@/components/display/text";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Spinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { useAuth } from "@/lib/auth-context";
import { useUsers } from "@/features/users/users-provider";
import type { UserWithRole } from "@/data/fetch-users";
import { Mail, Search, Shield, User, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { routes } from "@/screens/console-routes";

const roleColor: Record<string, "blue" | "purple" | "green" | "gray"> = {
  admin: "purple",
  editor: "blue",
  viewer: "green",
};

function getRoleColor(name: string | undefined) {
  if (!name) return "gray" as const;
  return roleColor[name.toLowerCase()] ?? ("gray" as const);
}

export function UsersScreen() {
  const { role, profile } = useAuth();
  const {
    state: { users, isLoading },
    actions: { loadUsers },
  } = useUsers();
  const { toast } = useFeedback();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const canManage = role?.can_manage_assignees === true;
  const currentUserId = profile?.id;

  const columns = useMemo(() => [
    {
      key: "name",
      header: "Name",
      render: (_: unknown, row: UserWithRole) => (
        <span className="flex items-center gap-2">
          {row.name} {row.surname}
          {row.id === currentUserId && <Badge label="You" color="blue" />}
        </span>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (_: unknown, row: UserWithRole) => (
        <Badge
          label={row.role?.name ?? "No role"}
          color={getRoleColor(row.role?.name)}
          icon={<Shield />}
        />
      ),
    },
  ], [currentUserId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Redirect viewers who have no read permission on users
  if (!role?.can_manage_assignees && !role?.can_manage_roles && role !== null) {
    return <Navigate to={`/${routes.dashboard}`} replace />;
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.surname.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role?.name ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Users</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            View and manage all users and their assigned roles.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Decision.Root value={filtered} loading={isLoading}>
          <Decision.Loading>
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState icon={<Users />} title="No users found" description="Try adjusting your search." />
          </Decision.Empty>
          <Decision.Data>
            <Drawer.Root open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
              <Card.Root>
                <Card.Header className="gap-2 flex-1 justify-end">
                  <Input icon={<Search />} placeholder="Search users..." className="w-full max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                </Card.Header>
                <Card.Content className="!border-secondary overflow-hidden">
                  <DataTable data={filtered} columns={columns} emptyMessage="No users match your search" onRowClick={(row) => setSelectedUser(row)} />
                </Card.Content>
              </Card.Root>
              {selectedUser && (
                <UserDetailDrawer
                  user={selectedUser}
                  canManage={canManage}
                  onClose={() => setSelectedUser(null)}
                  onSaved={(msg) => toast({ title: msg, variant: "success" })}
                  onError={(msg) => toast({ title: "Error", description: msg, variant: "error" })}
                />
              )}
            </Drawer.Root>
          </Decision.Data>
        </Decision.Root>
      </div>
    </section>
  );
}

// ─── Detail Drawer ──────────────────────────────────────────────────

type UserDetailDrawerProps = {
  user: UserWithRole;
  canManage: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
};

function UserDetailDrawer({ user, canManage, onClose, onSaved, onError }: UserDetailDrawerProps) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel className="!max-w-lg">
        <UserDetailDrawerContent
          user={user}
          canManage={canManage}
          onClose={onClose}
          onSaved={onSaved}
          onError={onError}
        />
      </Drawer.Panel>
    </Drawer.Portal>
  );
}

function UserDetailDrawerContent({ user, canManage, onClose, onSaved, onError }: UserDetailDrawerProps) {
  const { actions: drawerActions } = useDrawer();
  const {
    state: { roles },
    actions: { updateProfile, changeRole },
  } = useUsers();

  const [name, setName] = useState(user.name);
  const [surname, setSurname] = useState(user.surname);
  const [selectedRoleId, setSelectedRoleId] = useState(user.role?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const selectedRoleName = roles.find((r) => r.id === selectedRoleId)?.name ?? user.role?.name ?? "No role";
  const hasChanges = name !== user.name || surname !== user.surname || selectedRoleId !== (user.role?.id ?? "");

  const handleClose = useCallback(() => {
    onClose();
    drawerActions.close();
  }, [onClose, drawerActions]);

  async function handleSave() {
    setIsSaving(true);
    try {
      if (name !== user.name || surname !== user.surname) {
        await updateProfile(user.id, { name, surname });
      }
      if (selectedRoleId && selectedRoleId !== (user.role?.id ?? "")) {
        await changeRole(user.id, selectedRoleId);
      }
      onSaved("User updated successfully");
      handleClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setName(user.name);
    setSurname(user.surname);
    setSelectedRoleId(user.role?.id ?? "");
  }

  return (
    <>
      {/* Toolbar */}
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon variant="ghost" icon={<X />} onClick={handleClose} />
        <div className="flex-1" />
      </Drawer.Header>

      <Drawer.Content className="py-4">
        <div className="px-4 pb-4">
          <Title.h6>{user.name} {user.surname}</Title.h6>
        </div>

        {/* Meta details */}
        <div className="px-4 space-y-3">
          {/* First Name */}
          <MetaRow icon={<User className="size-4" />} label="First Name">
            {canManage ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                className="max-w-48"
                style="ghost"
              />
            ) : (
              <Paragraph.sm>{user.name}</Paragraph.sm>
            )}
          </MetaRow>

          {/* Last Name */}
          <MetaRow icon={<User className="size-4" />} label="Last Name">
            {canManage ? (
              <Input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Last name"
                className="max-w-48"
                style="ghost"
              />
            ) : (
              <Paragraph.sm>{user.surname}</Paragraph.sm>
            )}
          </MetaRow>

          {/* Email (always read-only) */}
          <MetaRow icon={<Mail className="size-4" />} label="Email">
            <Paragraph.sm>{user.email}</Paragraph.sm>
          </MetaRow>

          {/* Role */}
          <MetaRow icon={<Shield className="size-4" />} label="Role">
            {canManage ? (
              <Dropdown.Root placement="bottom">
                <Dropdown.Trigger>
                  <Badge
                    label={selectedRoleName}
                    icon={<Shield />}
                    color={getRoleColor(selectedRoleName)}
                    className="cursor-pointer"
                  />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                  {roles.map((r) => (
                    <Dropdown.Item key={r.id} onSelect={() => setSelectedRoleId(r.id)} className="px-1">
                      <Badge label={r.name} color={getRoleColor(r.name)} icon={<Shield />} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Panel>
              </Dropdown.Root>
            ) : (
              <Badge label={user.role?.name ?? "No role"} color={getRoleColor(user.role?.name)} icon={<Shield />} />
            )}
          </MetaRow>
        </div>
      </Drawer.Content>

      {/* Save footer — visible only when dirty */}
      {canManage && hasChanges && (
        <Drawer.Footer className="justify-end">
          <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </Drawer.Footer>
      )}
    </>
  );
}
