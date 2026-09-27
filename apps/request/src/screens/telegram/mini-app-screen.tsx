import { MiniAppShell } from "@/features/telegram/components/mini-app-shell"
import { MiniAppProvider } from "@/features/telegram/mini-app-context"
import { MiniAppContent } from "@/screens/telegram/mini-app-content"

export function MiniAppScreen() {
  return (
    <MiniAppShell>
      <MiniAppProvider>
        <MiniAppContent />
      </MiniAppProvider>
    </MiniAppShell>
  )
}
