import { isProviderRequestError, type ProviderRequestError } from "@/lib/provider-request-error"
import { useCallback, useMemo, useState } from "react"

type ReauthableConnection = {
  status: "active" | "reauth_required"
}

/**
 * Keeps the last actionable provider failure close to the streams screen. A
 * stored connection can become unusable between refreshes, so callers must be
 * able to disable provider actions immediately instead of waiting for the
 * connection row to reload.
 */
export function useProviderFailure<Connection extends ReauthableConnection>(connection: Connection | null, setConnection: (connection: Connection | null) => void) {
  const [failure, setFailure] = useState<ProviderRequestError | null>(null)

  const record = useCallback((error: unknown): ProviderRequestError | null => {
    const providerError = isProviderRequestError(error) ? error : null
    setFailure(providerError)
    if (providerError?.needsConnection && connection && connection.status !== "reauth_required") {
      const reauthConnection = { ...connection, status: "reauth_required" } as Connection
      setConnection(reauthConnection)
    }
    return providerError
  }, [connection, setConnection])

  const clear = useCallback(() => {
    setFailure(null)
  }, [])

  const actions = useMemo(() => ({ record, clear }), [clear, record])
  const meta = useMemo(() => ({
    needsConnection: failure?.needsConnection === true,
    needsConfiguration: failure?.needsConfiguration === true,
    isTransient: failure?.isTransient === true,
  }), [failure])

  return {
    state: { failure },
    actions,
    meta,
  }
}
