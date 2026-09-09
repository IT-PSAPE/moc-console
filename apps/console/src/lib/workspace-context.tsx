import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
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

    const userId = user?.id ?? null

    const loadWorkspaces = useCallback(
        async (uid: string, options: { setLoadingState?: boolean } = {}) => {
            const { setLoadingState = true } = options
            if (setLoadingState) setLoading(true)
            try {
                const directory = await fetchWorkspaceDirectory([uid])

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
            } finally {
                if (setLoadingState) setLoading(false)
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
            setLoading(false)
            return
        }

        let cancelled = false
        void (async () => {
            try {
                await loadWorkspaces(userId)
            } catch {
                if (!cancelled) setLoading(false)
            }
        })()

        return () => {
            cancelled = true
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
                navigate(`/${routes.dashboard}`, { replace: true })
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
            setCurrentWorkspaceId,
            refresh,
        }),
        [workspaces, currentWorkspaceId, roleByWorkspaceId, loading, setCurrentWorkspaceId, refresh],
    )

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider")
    return ctx
}
