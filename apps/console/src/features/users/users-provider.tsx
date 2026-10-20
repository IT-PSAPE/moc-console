import { approveWorkspaceJoinRequest, rejectWorkspaceJoinRequest, fetchPendingWorkspaceUsers, fetchUsersWithRoles, fetchAvailableRoles, updateUserProfile, assignUserRole } from "@/data/fetch-users";
import type { PendingWorkspaceUser, UserWithRole } from "@/data/fetch-users";
import type { Role } from "@moc/types/requests/assignee";
import { useWorkspace } from "@/lib/workspace-context";
import { useWorkspaceResource } from "@/hooks/use-workspace-resource";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMemberTypes } from "./use-member-types";

type UsersSnapshot = { users: UserWithRole[]; pendingUsers: PendingWorkspaceUser[]; roles: Role[] };
const emptyUsers: UsersSnapshot = { users: [], pendingUsers: [], roles: [] };

type UsersContextValue = {
  state: {
    users: UserWithRole[];
    pendingUsers: PendingWorkspaceUser[];
    roles: Role[];
    isLoading: boolean;
    isInitialLoading: boolean;
    error: Error | null;
    memberTypes: ReturnType<typeof useMemberTypes>["state"];
  };
  actions: {
    loadUsers: () => Promise<void>;
    retryUsers: () => Promise<void>;
    updateProfile: (userId: string, fields: { name?: string; surname?: string }) => Promise<void>;
    changeRole: (userId: string, roleId: string) => Promise<void>;
    approveUser: (requestId: string) => Promise<void>;
    rejectUser: (requestId: string) => Promise<void>;
    memberTypes: ReturnType<typeof useMemberTypes>["actions"];
  };
  meta: { memberTypes: ReturnType<typeof useMemberTypes>["meta"] };
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const { currentWorkspaceId, refresh, role } = useWorkspace();
  const canManage = role?.can_manage_roles === true;
  const fetcher = useCallback(async (workspaceId: string): Promise<UsersSnapshot> => {
    const [users, pendingUsers, roles] = await Promise.all([
      fetchUsersWithRoles(workspaceId),
      canManage ? fetchPendingWorkspaceUsers(workspaceId) : Promise.resolve([] as PendingWorkspaceUser[]),
      fetchAvailableRoles(),
    ]);
    return { users, pendingUsers, roles };
  }, [canManage]);
  const resource = useWorkspaceResource({ emptyValue: emptyUsers, fetcher, resource: `users:${canManage ? "managed" : "member"}`, workspaceId: currentWorkspaceId });
  const { data, isLoading, isInitialLoading, error, load, updateData } = resource;

  const onTypeAssigned = useCallback((userId: string, typeId: string) => {
    updateData((current) => ({ ...current, users: current.users.map((user) => user.id === userId ? { ...user, memberTypeId: typeId } : user) }));
  }, [updateData]);
  const memberTypes = useMemberTypes(onTypeAssigned);
  const loadUsers = useCallback(() => load(), [load]);
  const retryUsers = useCallback(() => load(true), [load]);

  const updateProfile = useCallback(async (userId: string, fields: { name?: string; surname?: string }) => {
    await updateUserProfile(userId, fields);
    updateData((current) => ({ ...current, users: current.users.map((user) => user.id === userId ? { ...user, ...fields } : user) }));
  }, [updateData]);

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await assignUserRole(currentWorkspaceId, userId, roleId);
    await refresh();
    updateData((current) => {
      const newRole = current.roles.find((item) => item.id === roleId) ?? null;
      return { ...current, users: current.users.map((user) => user.id === userId ? { ...user, role: newRole } : user) };
    });
  }, [currentWorkspaceId, refresh, updateData]);

  const approveUser = useCallback(async (requestId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await approveWorkspaceJoinRequest(requestId, currentWorkspaceId);
    await load(true);
  }, [currentWorkspaceId, load]);

  const rejectUser = useCallback(async (requestId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await rejectWorkspaceJoinRequest(requestId, currentWorkspaceId);
    updateData((current) => ({ ...current, pendingUsers: current.pendingUsers.filter((user) => user.requestId !== requestId) }));
  }, [currentWorkspaceId, updateData]);

  const value = useMemo(() => ({
    state: { users: data.users, pendingUsers: data.pendingUsers, roles: data.roles, isLoading, isInitialLoading, error, memberTypes: memberTypes.state },
    actions: { loadUsers, retryUsers, updateProfile, changeRole, approveUser, rejectUser, memberTypes: memberTypes.actions },
    meta: { memberTypes: memberTypes.meta },
  }), [data, isLoading, isInitialLoading, error, memberTypes, loadUsers, retryUsers, updateProfile, changeRole, approveUser, rejectUser]);

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);

  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider");
  }

  return context;
}
