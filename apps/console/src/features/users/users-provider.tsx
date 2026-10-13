import { approveWorkspaceJoinRequest, rejectWorkspaceJoinRequest, fetchPendingWorkspaceUsers, fetchUsersWithRoles, fetchAvailableRoles, updateUserProfile, assignUserRole } from "@/data/fetch-users";
import type { PendingWorkspaceUser, UserWithRole } from "@/data/fetch-users";
import type { Role } from "@moc/types/requests/assignee";
import { useWorkspace } from "@/lib/workspace-context";
import { createContext, useCallback, useContext, useMemo, useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { useMemberTypes } from './use-member-types';

type UsersContextValue = {
  state: {
    users: UserWithRole[];
    pendingUsers: PendingWorkspaceUser[];
    roles: Role[];
    isLoading: boolean;
    isInitialLoading: boolean;
    memberTypes: ReturnType<typeof useMemberTypes>['state'];
  };
  actions: {
    loadUsers: () => Promise<void>;
    updateProfile: (userId: string, fields: { name?: string; surname?: string }) => Promise<void>;
    changeRole: (userId: string, roleId: string) => Promise<void>;
    approveUser: (requestId: string) => Promise<void>;
    rejectUser: (requestId: string) => Promise<void>;
    memberTypes: ReturnType<typeof useMemberTypes>['actions'];
  };
  meta: {memberTypes: ReturnType<typeof useMemberTypes>['meta']};
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingWorkspaceUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const onTypeAssigned = useCallback((userId:string,typeId:string) => {
    setUsers(current => current.map(user => user.id===userId ? {...user,memberTypeId:typeId} : user));
  }, []);
  const memberTypes = useMemberTypes(onTypeAssigned);

  const { currentWorkspaceId, refresh, role } = useWorkspace();
  const canManage = role?.can_manage_roles === true;
  const loadKey = `${currentWorkspaceId ?? ''}:${canManage}`;
  const activeLoadKeyRef = useRef<string | null>(loadKey);
  const loadedKeyRef = useRef<string | null>(null);
  const [loadedWorkspaceKey, setLoadedWorkspaceKey] = useState<string | null>(null);
  const promiseRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const [trackedLoadKey, setTrackedLoadKey] = useState(loadKey);
  if (trackedLoadKey !== loadKey) {
    setTrackedLoadKey(loadKey);
    setUsers([]);
    setPendingUsers([]);
    setRoles([]);
    setIsLoading(false);
  }

  useLayoutEffect(() => {
    activeLoadKeyRef.current = loadKey;
    loadedKeyRef.current = null;
    promiseRef.current = null;
    return () => { activeLoadKeyRef.current = null; };
  }, [loadKey]);

  const loadUsers = useCallback(async (): Promise<void> => {
    if (!currentWorkspaceId || loadedKeyRef.current === loadKey) return;
    if (promiseRef.current?.key === loadKey) return promiseRef.current.promise;
    setIsLoading(true);

    const promise: Promise<void> = Promise.all([
      fetchUsersWithRoles(currentWorkspaceId),
      canManage ? fetchPendingWorkspaceUsers(currentWorkspaceId) : Promise.resolve([] as PendingWorkspaceUser[]),
      fetchAvailableRoles(),
    ])
      .then(([usersData, pendingUsersData, rolesData]) => {
        if (activeLoadKeyRef.current !== loadKey || promiseRef.current?.promise !== promise) return;
        setUsers(usersData);
        setPendingUsers(pendingUsersData);
        setRoles(rolesData);
        loadedKeyRef.current = loadKey;
        setLoadedWorkspaceKey(loadKey);
      })
      .finally(() => {
        if (promiseRef.current?.promise !== promise) return;
        promiseRef.current = null;
        if (activeLoadKeyRef.current === loadKey) setIsLoading(false);
      });

    promiseRef.current = { key: loadKey, promise };
    return promise;
  }, [canManage, currentWorkspaceId, loadKey]);

  const updateProfile = useCallback(async (userId: string, fields: { name?: string; surname?: string }) => {
    await updateUserProfile(userId, fields);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...fields } : u)),
    );
  }, []);

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await assignUserRole(currentWorkspaceId, userId, roleId);
    await refresh();
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newRole = roles.find((r) => r.id === roleId) ?? null;
        return { ...u, role: newRole };
      }),
    );
  }, [currentWorkspaceId, refresh, roles]);

  const approveUser = useCallback(async (requestId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await approveWorkspaceJoinRequest(requestId, currentWorkspaceId);
    const acceptedUsers = await fetchUsersWithRoles(currentWorkspaceId);
    setPendingUsers((current) => current.filter((user) => user.requestId !== requestId));
    setUsers(acceptedUsers);
  }, [currentWorkspaceId]);

  const rejectUser = useCallback(async (requestId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected");
    await rejectWorkspaceJoinRequest(requestId, currentWorkspaceId);
    setPendingUsers((current) => current.filter((user) => user.requestId !== requestId));
  }, [currentWorkspaceId]);

  const value = useMemo(
    () => ({
      state: { users, pendingUsers, roles, isLoading, isInitialLoading: loadedWorkspaceKey !== loadKey, memberTypes: memberTypes.state },
      actions: { loadUsers, updateProfile, changeRole, approveUser, rejectUser, memberTypes: memberTypes.actions },
      meta: {memberTypes: memberTypes.meta},
    }),
    [users, pendingUsers, roles, isLoading, loadedWorkspaceKey, loadKey, loadUsers, updateProfile, changeRole, approveUser, rejectUser, memberTypes],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);

  if (!context) {
    throw new Error("useUsers must be used within a UsersProvider");
  }

  return context;
}
