import type { ChangeEvent } from "react"
import { Page } from "@moc/ui/components/layout/page"
import { Input } from "@moc/ui/components/form/input"
import { YouTubeStreamsView } from "@/features/streams/youtube-streams"
import { ZoomMeetingsView } from "@/features/streams/zoom-meetings"
import { Search } from "lucide-react"
import { useStreamsScreen } from "./use-streams-screen"

export function StreamsScreen() {
  const { state, actions } = useStreamsScreen()

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearchQuery(event.target.value)
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Streams</Page.Title>
        </Page.Heading>
      </Page.Header>

      <Page.Toolbar>
          <div className="flex flex-1 justify-end">
            <Input
              aria-label="Search streams and meetings"
              name="stream-search"
              autoComplete="off"
              icon={<Search />}
              placeholder="Search streams and meetings…"
              className="w-full max-w-md"
              value={state.searchQuery}
              onChange={handleSearchChange}
            />
          </div>
      </Page.Toolbar>

      <Page.Content className="flex flex-col gap-4">
        <YouTubeStreamsView searchQuery={state.searchQuery} />
        <ZoomMeetingsView searchQuery={state.searchQuery} />
      </Page.Content>
    </Page>
  )
}
