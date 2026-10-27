import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  disableWebPush,
  enableWebPushForUser,
  fetchWebPushConfiguration,
  fetchWebPushStatus,
  getLocalWebPushSubscription,
  getWebPushEnvironment,
  getWebPushPermission,
  requestWebPushPermissionThenEnable,
  reconcileWebPushOwner,
  sendWebPushTest,
} from "@/data/web-push"
import type { PushConfiguration } from "@moc/sdk/push"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

type PushPermission = NotificationPermission | "unsupported"

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}

export function useWebPush(open: boolean) {
  const { profile } = useAuth()
  const { toast } = useFeedback()
  const [configuration, setConfiguration] = useState<PushConfiguration | null>(null)
  const [permission, setPermission] = useState<PushPermission>("unsupported")
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const environment = getWebPushEnvironment()
  const profileId = profile?.id ?? null
  const refreshRequestRef = useRef(0)
  const currentProfileIdRef = useRef(profileId)
  currentProfileIdRef.current = profileId

  const refresh = useCallback(async () => {
    if (!open || !profileId) return
    const request = ++refreshRequestRef.current
    setIsLoading(true)
    setError(null)
    setConfiguration(null)
    setIsEnabled(false)
    setPermission(getWebPushPermission())
    try {
      const nextConfiguration = await fetchWebPushConfiguration()
      if (request !== refreshRequestRef.current || currentProfileIdRef.current !== profileId) return
      await reconcileWebPushOwner(profileId)
      if (request !== refreshRequestRef.current || currentProfileIdRef.current !== profileId) return
      const subscription = await getLocalWebPushSubscription()
      if (request !== refreshRequestRef.current || currentProfileIdRef.current !== profileId) return
      const subscribed = subscription
        ? await fetchWebPushStatus(subscription.endpoint)
        : false
      if (request !== refreshRequestRef.current || currentProfileIdRef.current !== profileId) return
      setConfiguration(nextConfiguration)
      setIsEnabled(subscribed)
    } catch (cause) {
      if (request === refreshRequestRef.current) setError(describeError(cause))
    } finally {
      if (request === refreshRequestRef.current) setIsLoading(false)
    }
  }, [open, profileId])

  useEffect(() => {
    if (!open) {
      refreshRequestRef.current += 1
      return
    }
    void refresh()
    return () => { refreshRequestRef.current += 1 }
  }, [open, refresh])

  async function enable(): Promise<void> {
    if (!profileId || !configuration?.enabled || !configuration.publicKey || !environment.supported || environment.requiresHomeScreen) return
    const publicKey = configuration.publicKey
    const currentPermission = getWebPushPermission()
    if (currentPermission === "denied" || currentPermission === "unsupported") return

    setIsBusy(true)
    setError(null)
    try {
      const nextPermission = await requestWebPushPermissionThenEnable(
        currentPermission,
        () => Notification.requestPermission(),
        async () => {
          if (currentProfileIdRef.current !== profileId) return
          await enableWebPushForUser(profileId, publicKey)
        },
      )
      setPermission(nextPermission)
      if (nextPermission !== "granted") return
      if (currentProfileIdRef.current !== profileId) return

      setIsEnabled(true)
      toast({ title: "Web notifications enabled", variant: "success" })
    } catch (cause) {
      if (currentProfileIdRef.current !== profileId) return
      setError(describeError(cause))
      toast({ title: "Could not enable web notifications", description: describeError(cause), variant: "error" })
    } finally {
      setIsBusy(false)
    }
  }

  async function disable(): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      await disableWebPush()
      setIsEnabled(false)
      toast({ title: "Web notifications disabled", variant: "success" })
    } catch (cause) {
      let isStillEnabled: boolean | null = null
      try {
        isStillEnabled = Boolean(await getLocalWebPushSubscription())
      } catch {
        isStillEnabled = null
      }
      if (isStillEnabled === false) {
        setIsEnabled(false)
      } else if (isStillEnabled === true) {
        setIsEnabled(true)
      }
      const message = isStillEnabled === false
        ? "This device was disconnected, but Console could not confirm server cleanup."
        : isStillEnabled === true
          ? "This browser kept the subscription active. Try again to turn notifications off."
          : "Console could not confirm whether notifications were turned off. Try again."
      setError(message)
      toast({
        title: isStillEnabled === false ? "Notifications stopped on this device" : "Could not turn off notifications",
        description: message,
        variant: isStillEnabled === false ? "info" : "error",
      })
      if (import.meta.env.DEV) console.error("Failed to remove web push subscription:", cause)
    } finally {
      setIsBusy(false)
    }
  }

  async function changeEnabled(next: boolean): Promise<void> {
    if (next) await enable()
    else await disable()
  }

  async function sendTest(): Promise<void> {
    if (!isEnabled || !profileId || isLoading || isBusy) return
    setIsTesting(true)
    try {
      const subscription = await getLocalWebPushSubscription()
      if (currentProfileIdRef.current !== profileId) return
      if (!subscription) throw new Error("This device no longer has a push subscription")
      const queued = await sendWebPushTest(subscription.endpoint)
      if (currentProfileIdRef.current !== profileId) return
      if (!queued) throw new Error("Console could not queue a test notification")
      toast({ title: "Test notification queued", description: "It should arrive within a minute.", variant: "success" })
    } catch (cause) {
      if (currentProfileIdRef.current !== profileId) return
      setError(describeError(cause))
      toast({ title: "Could not send a test notification", description: describeError(cause), variant: "error" })
    } finally {
      setIsTesting(false)
    }
  }

  let availabilityMessage: string | null = null
  if (environment.requiresHomeScreen) availabilityMessage = "On iPhone or iPad, add Console to your Home Screen and open it there to enable notifications."
  else if (!environment.supported) availabilityMessage = "Web notifications are not supported in this browser."
  else if (permission === "denied" && !isEnabled) availabilityMessage = "Notifications are blocked in this browser's site settings."
  else if (configuration?.enabled === false && !isEnabled) availabilityMessage = "Web notifications are not configured for Console yet."

  const canEnable = Boolean(
    configuration?.enabled
    && configuration.publicKey
    && environment.supported
    && !environment.requiresHomeScreen
    && permission !== "denied"
    && permission !== "unsupported",
  )
  const canToggle = !isLoading && !isBusy && (isEnabled || canEnable)

  return {
    state: { isEnabled, isLoading, isBusy, isTesting, error },
    actions: { refresh, changeEnabled, sendTest },
    meta: { availabilityMessage, canToggle },
  }
}
