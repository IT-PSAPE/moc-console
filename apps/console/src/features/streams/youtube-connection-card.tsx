import { IntegrationCard } from "./integration-card"
import { useYouTubeConnection } from "./use-youtube-connection"

export function YouTubeConnectionCard() {
  const { state, actions, meta } = useYouTubeConnection()

  return (
    <IntegrationCard
      icon={<img src="/resources/logo/Youtube.svg" alt="YouTube" width="20" height="20" />}
      name="YouTube"
      isLoading={meta.isLoading}
      isConnected={Boolean(meta.connection)}
      needsReauth={meta.connection?.status === "reauth_required"}
      accountLabel={meta.connection?.channelTitle ?? null}
      canManage={meta.canManage}
      onConnect={actions.connect}
      onDisconnect={actions.disconnect}
      isDisconnecting={state.isDisconnecting}
    />
  )
}
