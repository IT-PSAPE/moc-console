import { useState } from "react"
import { Header } from "@/components/display/header"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { YouTubeStreamsView } from "@/features/broadcast/youtube-streams"
import { ZoomMeetingsView } from "@/features/broadcast/zoom-meetings"
import { Search } from "lucide-react"

export function StreamsScreen() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Streams</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage your live streams and scheduled meetings.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <Label.md>Live</Label.md>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input
              icon={<Search />}
              placeholder="Search streams and meetings..."
              className="w-full max-w-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Header.Trail>
        </Header>

        <YouTubeStreamsView searchQuery={searchQuery} />
        <ZoomMeetingsView searchQuery={searchQuery} />
      </div>
    </section>
  )
}
