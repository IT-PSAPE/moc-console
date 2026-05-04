import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWorkspaceDirectory } from "@/data/fetch-workspaces"
import { setCurrentWorkspaceIdMirror } from "@/data/current-workspace"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"
import type { Workspace } from "@/types/workspace"

const STORAGE_KEY = "currentWorkspaceId"

type WorkspaceContextValue = {
    workspaces: Workspace[]
    currentWorkspaceId: string | null
    loading: boolean
    setCurrentWorkspaceId: (id: string) => void
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
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const userId = profile?.id ?? null

    useEffect(() => {
        if (!userId) {
            setWorkspaces([])
            setCurrentWorkspaceIdState(null)
            setCurrentWorkspaceIdMirror(null)
            setLoading(false)
            return
        }

        let cancelled = false
        setLoading(true)

        void (async () => {
            try {
                const directory = await fetchWorkspaceDirectory([userId])
                if (cancelled) return

                const memberWorkspaceIds = new Set(
                    directory.memberships.filter((m) => m.userId === userId).map((m) => m.workspaceId),
                )
                const myWorkspaces = directory.workspaces.filter((w) => memberWorkspaceIds.has(w.id))

                setWorkspaces(myWorkspaces)

                const stored = readStoredWorkspaceId()
                const initial =
                    (stored && myWorkspaces.some((w) => w.id === stored) && stored) ||
                    myWorkspaces[0]?.id ||
                    null

                setCurrentWorkspaceIdState(initial)
                setCurrentWorkspaceIdMirror(initial)
                writeStoredWorkspaceId(initial)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [userId])

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
        () => ({ workspaces, currentWorkspaceId, loading, setCurrentWorkspaceId }),
        [workspaces, currentWorkspaceId, loading, setCurrentWorkspaceId],
    )

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext)
    if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider")
    return ctx
}
