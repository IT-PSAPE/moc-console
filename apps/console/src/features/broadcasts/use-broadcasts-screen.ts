import { fetchBroadcasts } from "@/data/fetch-broadcasts"
import { createBroadcast } from "@/data/mutate-broadcasts"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import { useWorkspace } from "@/lib/workspace-context"
import type { Broadcast, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { DEFAULT_BROADCAST_LOOP_ENABLED, DEFAULT_BROADCAST_PRELOAD_COUNT } from "@moc/types/broadcast/broadcast-constants"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useMemo, useState } from "react"
import { getBroadcastPublicUrl } from "./broadcast-public-url"

const initialFormState = {
  title: "",
  description: "",
  kind: "audio" as BroadcastKind,
  isPublished: true,
  loopEnabled: DEFAULT_BROADCAST_LOOP_ENABLED,
  preloadCount: DEFAULT_BROADCAST_PRELOAD_COUNT,
  files: [] as File[],
}

export function useBroadcastsScreen() {
  const { currentWorkspaceId, role } = useWorkspace()
  const { toast } = useFeedback()
  const copyFeedback = useCopyFeedback<string>()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState(initialFormState.title)
  const [description, setDescription] = useState(initialFormState.description)
  const [kind, setKind] = useState<BroadcastKind>(initialFormState.kind)
  const [isPublished, setIsPublished] = useState(initialFormState.isPublished)
  const [loopEnabled, setLoopEnabled] = useState(initialFormState.loopEnabled)
  const [preloadCount, setPreloadCount] = useState(initialFormState.preloadCount)
  const [files, setFiles] = useState<File[]>(initialFormState.files)

  useEffect(() => {
    if (!currentWorkspaceId || !role?.can_read) {
      setBroadcasts([])
      return
    }

    const workspaceId = currentWorkspaceId
    let cancelled = false

    async function loadBroadcasts() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const nextBroadcasts = await fetchBroadcasts(workspaceId)

        if (!cancelled) {
          setBroadcasts(nextBroadcasts)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Broadcasts could not be loaded.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadBroadcasts()

    return () => {
      cancelled = true
    }
  }, [currentWorkspaceId, role?.can_read])

  const filteredBroadcasts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return broadcasts
    }

    return broadcasts.filter((broadcast) => {
      const matchesBroadcast = `${broadcast.title} ${broadcast.description} ${broadcast.slug}`.toLowerCase().includes(query)
      const matchesItem = broadcast.items.some((item) => item.title.toLowerCase().includes(query))
      return matchesBroadcast || matchesItem
    })
  }, [broadcasts, searchQuery])

  function resetForm() {
    setTitle(initialFormState.title)
    setDescription(initialFormState.description)
    setKind(initialFormState.kind)
    setIsPublished(initialFormState.isPublished)
    setLoopEnabled(initialFormState.loopEnabled)
    setPreloadCount(initialFormState.preloadCount)
    setFiles(initialFormState.files)
  }

  function openCreate() {
    resetForm()
    setIsCreateOpen(true)
  }

  function closeCreate() {
    if (isSubmitting) {
      return
    }

    setIsCreateOpen(false)
  }

  async function reload() {
    if (!currentWorkspaceId) {
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      setBroadcasts(await fetchBroadcasts(currentWorkspaceId))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Broadcasts could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }

  async function submitCreate() {
    if (!currentWorkspaceId) {
      toast({ title: "No workspace selected", variant: "error" })
      return
    }

    if (!title.trim()) {
      toast({ title: "Broadcast title required", variant: "error" })
      return
    }

    if (files.length === 0) {
      toast({ title: "Add at least one file", variant: "error" })
      return
    }

    setIsSubmitting(true)

    try {
      const broadcast = await createBroadcast({
        workspaceId: currentWorkspaceId,
        title: title.trim(),
        description: description.trim(),
        kind,
        isPublished,
        loopEnabled,
        preloadCount: Math.min(3, Math.max(1, preloadCount)),
        files,
      })

      setBroadcasts((current) => [broadcast, ...current])
      setIsCreateOpen(false)
      resetForm()
      toast({ title: "Broadcast created", variant: "success" })
    } catch (error) {
      toast({
        title: "Failed to create broadcast",
        description: error instanceof Error ? error.message : "The broadcast could not be created.",
        variant: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyPublicLink(broadcast: Broadcast) {
    const publicUrl = getBroadcastPublicUrl(broadcast.slug)

    if (!publicUrl) {
      toast({
        title: "Broadcast app URL missing",
        description: "Set VITE_BROADCAST_APP_URL to copy public player links from the console.",
        variant: "error",
      })
      return
    }

    await copyFeedback.actions.copy(publicUrl, broadcast.id)
  }

  return {
    state: {
      broadcasts,
      filteredBroadcasts,
      searchQuery,
      isCreateOpen,
      isLoading,
      isSubmitting,
      loadError,
      title,
      description,
      kind,
      isPublished,
      loopEnabled,
      preloadCount,
      files,
      copiedField: copyFeedback.state.copiedField,
      copyMessage: copyFeedback.state.copyMessage,
    },
    actions: {
      setSearchQuery,
      openCreate,
      closeCreate,
      setIsCreateOpen,
      reload,
      submitCreate,
      setTitle,
      setDescription,
      setKind,
      setIsPublished,
      setLoopEnabled,
      setPreloadCount,
      setFiles,
      copyPublicLink,
    },
    meta: {
      canCreate: role?.can_create ?? false,
      canRead: role?.can_read ?? false,
      publicUrlConfigured: Boolean(import.meta.env.VITE_BROADCAST_APP_URL?.trim()),
    },
  }
}
