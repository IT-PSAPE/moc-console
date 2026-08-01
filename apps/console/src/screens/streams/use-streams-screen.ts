import { useState } from "react"

export function useStreamsScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  return { state: { searchQuery }, actions: { setSearchQuery } }
}
