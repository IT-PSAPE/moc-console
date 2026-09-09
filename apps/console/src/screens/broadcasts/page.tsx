import { Broadcasts } from "@/features/broadcasts/broadcasts-collection"

export function BroadcastsScreen() {
  return (
    <Broadcasts.Root>
      <Broadcasts.Collection />
    </Broadcasts.Root>
  )
}
