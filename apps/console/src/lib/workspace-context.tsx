import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { queryClient } from "@/lib/query-client"
import { fetchWorkspaceDirectory } from "@/data/fetch-workspaces"
import { setCurrentWorkspaceIdMirror } from "@/data/current-workspace"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import type { Workspace } from "@moc/types/workspace"
import type { Role } from "@moc/types/requests/assignee"

const STORAGE_KEY = "currentWorkspaceId"

type WorkspaceContextValue = {
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    currentWorkspaceId: string | null
    role: Role | null
    loading: boolean
    error: Error | null
    setCurrentWorkspaceId: (id: string) => void
    refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function readStoredWorkspaceId(): string | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function writeStoredWorkspaceId(id: string | null) {
    if (typeof window === "undefined") return
    try {
        if (id) {
            window.localStorage.setItem(STORAGE_KEY, id)
        } else {
            window.localStorage.removeItem(STORAGE_KEY)
        }
    } catch {
        /* ignore */
    }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(null)
    const [roleByWorkspaceId, setRoleByWorkspaceId] = useState<Map<string, Role>>(new Map())
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const loadRequestRef = useRef(0)

    const userId = user?.id ?? null

    const loadWorkspaces = useCallback(
        async (uid: string, options: { setLoadingState?: boolean } = {}) => {
            const request = ++loadRequestRef.current
            const { setLoadingState = true } = options
            if (setLoadingState) setLoading(true)
            setError(null)
            try {
                const queryKey = ["user", uid, "workspace-directory"]
                if (!setLoadingState) await queryClient.cancelQueries({ queryKey, exact: true })
                const directory = await queryClient.fetchQuery({ queryKey, queryFn: fetchWorkspaceDirectory, ...(!setLoadingState ? { staleTime: 0 } : {}) })
                if (request !== loadRequestRef.current) return

                const memberWorkspaceIds = new Set(
                    directory.memberships.filter((m) => m.userId === uid).map((m) => m.workspaceId),
                )
                const myWorkspaces = directory.workspaces.filter((w) => memberWorkspaceIds.has(w.id))
                setRoleByWorkspaceId(new Map(
                    directory.memberships
                        .filter((membership) => membership.userId === uid && membership.role)
                        .map((membership) => [membership.workspaceId, membership.role as Role]),
                ))

                setWorkspaces(myWorkspaces)

                setCurrentWorkspaceIdState((prev) => {
                    if (request !== loadRequestRef.current) return prev
                    const stored = readStoredWorkspaceId()
                    const next =
                        (prev && myWorkspaces.some((w) => w.id === prev) && prev) ||
                        (stored && myWorkspaces.some((w) => w.id === stored) && stored) ||
                        myWorkspaces[0]?.id ||
                        null
                    setCurrentWorkspaceIdMirror(next)
                    writeStoredWorkspaceId(next)
                    return next
                })
            } catch (reason: unknown) {
                if (request === loadRequestRef.current) setError(reason instanceof Error ? reason : new Error("Couldn't load workspace access"))
            } finally {
                if (request === loadRequestRef.current) setLoading(false)
            }
        },
        [],
    )

    useEffect(() => {
        if (!userId) {
            setWorkspaces([])
            setCurrentWorkspaceIdState(null)
            setRoleByWorkspaceId(new Map())
            setCurrentWorkspaceIdMirror(null)
            setError(null)
            setLoading(false)
            return
        }

        void loadWorkspaces(userId)

        return () => {
            loadRequestRef.current += 1
        }
    }, [userId, loadWorkspaces])

    const refresh = useCallback(async () => {
        if (!userId) return
        await loadWorkspaces(userId, { setLoadingState: false })
    }, [userId, loadWorkspaces])

    const setCurrentWorkspaceId = useCallback(
        (id: string) => {
            setCurrentWorkspaceIdState((prev) => {
                if (prev === id) return prev
                setCurrentWorkspaceIdMirror(id)
                writeStoredWorkspaceId(id)
                navigate(`/${routes.overview}`, { replace: true })
                return id
            })
        },
        [navigate],
    )

    const value = useMemo(
        () => ({
            workspaces,
            currentWorkspace: workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null,
            currentWorkspaceId,
            role: currentWorkspaceId ? roleByWorkspaceId.get(currentWorkspaceId) ?? null : null,
            loading,
            error,
            setCurrentWorkspaceId,
            refresh,
        }),
        [workspaces, currentWorkspaceId, roleByWorkspaceId, loading, error, setCurrentWorkspaceId, refresh],
    )

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider")
    return ctx
}
