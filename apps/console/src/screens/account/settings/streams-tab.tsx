import { StreamsProvider } from "@/features/streams/streams-provider"
import { StreamsTabContent } from "./streams-tab-content"

export function StreamsTab() {
  return (
    <StreamsProvider>
      <StreamsTabContent />
    </StreamsProvider>
  )
}
