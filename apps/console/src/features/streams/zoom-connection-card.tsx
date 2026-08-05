import { IntegrationCard } from "./integration-card"
import { useZoomConnection } from "./use-zoom-connection"

export function ZoomConnectionCard() {
  const { state, actions, meta } = useZoomConnection()

  return (
    <IntegrationCard
      icon={<img src="/resources/logo/Zoom.svg" alt="Zoom" />}
      name="Zoom"
      isLoading={meta.isLoading}
      isConnected={Boolean(meta.connection)}
      accountLabel={meta.connection?.displayName ?? null}
      canManage={meta.canManage}
      onConnect={actions.connect}
      onDisconnect={actions.disconnect}
      isDisconnecting={state.isDisconnecting}
    />
  )
}
