import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'

function QueryHookSnapshot<T>({ read, onRead }: { read: () => T; onRead: (value: T) => void }) {
  onRead(read())
  return null
}

// SSR runs real React and TanStack hooks without adding a DOM/testing dependency.
// Call again after awaiting an action to inspect the current QueryClient snapshot.
export function renderQueryHook<T>(read: () => T, client: QueryClient): T {
  const snapshot: { value?: T } = {}
  function capture(value: T): void { snapshot.value = value }
  renderToStaticMarkup(<QueryClientProvider client={client}><QueryHookSnapshot read={read} onRead={capture} /></QueryClientProvider>)
  return snapshot.value as T
}
