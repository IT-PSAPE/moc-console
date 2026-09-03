import { BroadcastCreateModal } from "@/features/broadcasts/broadcast-create-modal"
import { BroadcastsList } from "@/features/broadcasts/broadcasts-list"
import { useBroadcastsScreen } from "@/features/broadcasts/use-broadcasts-screen"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Input } from "@moc/ui/components/form/input"
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar"
import { Page } from "@moc/ui/components/layout/page"
import { RadioTower, RefreshCw, Search } from "lucide-react"
import type { ChangeEvent } from "react"

export function BroadcastsScreen() {
  const { state, actions, meta } = useBroadcastsScreen()

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearchQuery(event.target.value)
  }

  function handleCreateOpenChange(open: boolean) {
    actions.setIsCreateOpen(open)
  }

  function handleReload() {
    void actions.reload()
  }

  function handleSubmitCreate() {
    void actions.submitCreate()
  }

  function handleCopyPublicLink(broadcast: Parameters<typeof actions.copyPublicLink>[0]) {
    void actions.copyPublicLink(broadcast)
  }

  function renderCreateAction() {
    if (!meta.canCreate) {
      return undefined
    }

    return (
      <Button variant="secondary" onClick={actions.openCreate}>
        Create broadcast
      </Button>
    )
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Broadcast</Page.Title>
          <Page.Description>Create looping audio-only or video-only playlists for the public playback app.</Page.Description>
        </Page.Heading>
      </Page.Header>

      <CollectionToolbar>
        <CollectionToolbar.Actions>
          <Input
            aria-label="Search broadcasts"
            name="broadcast-search"
            autoComplete="off"
            icon={<Search />}
            placeholder="Search broadcasts..."
            className="w-full max-w-md"
            value={state.searchQuery}
            onChange={handleSearchChange}
          />
          <Button.Icon aria-label="Reload broadcasts" variant="secondary" icon={<RefreshCw />} onClick={handleReload} />
          {meta.canCreate ? (
            <CollectionToolbar.ActionButton aria-label="Create broadcast" onClick={actions.openCreate}>
              New broadcast
            </CollectionToolbar.ActionButton>
          ) : null}
        </CollectionToolbar.Actions>
      </CollectionToolbar>

      <Page.Content className="flex flex-col gap-4">
        {!meta.publicUrlConfigured ? (
          <Alert
            variant="info"
            title="Public app URL not configured"
            description="Set VITE_BROADCAST_APP_URL in the console app to enable copyable player links."
          />
        ) : null}
        {state.loadError ? (
          <Alert variant="error" title="Could not load broadcasts" description={state.loadError} />
        ) : null}
        {state.copyMessage ? (
          <Alert variant={state.copiedField ? "success" : "error"} title={state.copyMessage} />
        ) : null}
        {state.isLoading ? (
          <LoadingSpinner className="py-10" />
        ) : state.filteredBroadcasts.length > 0 ? (
          <BroadcastsList broadcasts={state.filteredBroadcasts} onCopyPublicLink={handleCopyPublicLink} />
        ) : (
          <EmptyState
            icon={<RadioTower />}
            title={state.searchQuery.trim() ? "No broadcasts match your search" : "No broadcasts yet"}
            description={state.searchQuery.trim() ? "Try a different title or file name." : "Create your first audio or video playlist to start the new public broadcast flow."}
            action={renderCreateAction()}
          />
        )}
      </Page.Content>

      <BroadcastCreateModal
        description={state.description}
        files={state.files}
        isOpen={state.isCreateOpen}
        isPublished={state.isPublished}
        isSubmitting={state.isSubmitting}
        kind={state.kind}
        loopEnabled={state.loopEnabled}
        preloadCount={state.preloadCount}
        title={state.title}
        onDescriptionChange={actions.setDescription}
        onFilesChange={actions.setFiles}
        onIsPublishedChange={actions.setIsPublished}
        onKindChange={actions.setKind}
        onLoopEnabledChange={actions.setLoopEnabled}
        onOpenChange={handleCreateOpenChange}
        onPreloadCountChange={actions.setPreloadCount}
        onSubmit={handleSubmitCreate}
        onTitleChange={actions.setTitle}
      />
    </Page>
  )
}
