import { moc } from "@/lib/moc-client"
import type { PushConfiguration } from "@moc/sdk/push"

const PUSH_OWNER_KEY = "moc-console-push-owner"
let activeWebPushUserId: string | null | undefined
let webPushEnableEpoch = 0
const pendingWebPushEnables = new Set<Promise<unknown>>()

export type WebPushEnvironment = {
  supported: boolean
  requiresHomeScreen: boolean
}

export async function requestWebPushPermissionThenEnable(
  permission: NotificationPermission,
  requestPermission: () => Promise<NotificationPermission>,
  enable: () => Promise<void>,
): Promise<NotificationPermission> {
  const permissionRequest = permission === "default"
    ? requestPermission()
    : Promise.resolve(permission)
  const nextPermission = await permissionRequest
  if (nextPermission === "granted") await enable()
  return nextPermission
}

export async function fetchWebPushConfiguration(): Promise<PushConfiguration> {
  return moc.push.config()
}

export async function fetchWebPushStatus(endpoint: string): Promise<boolean> {
  const status = await moc.push.status(endpoint)
  return status.subscribed
}

export async function sendWebPushTest(endpoint: string): Promise<boolean> {
  const result = await moc.push.test(endpoint)
  return result.queued
}

export function getWebPushEnvironment(): WebPushEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, requiresHomeScreen: false }
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches === true
    || standaloneNavigator.standalone === true
  const supported = window.isSecureContext
    && "Notification" in window
    && "PushManager" in window
    && "serviceWorker" in navigator

  return { supported, requiresHomeScreen: isIos && !isStandalone }
}

export function getWebPushPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported"
}

export function decodeWebPushPublicKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const binary = globalThis.atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function getWebPushOwnerId(): string | null {
  try {
    return window.localStorage.getItem(PUSH_OWNER_KEY)
  } catch {
    return null
  }
}

function setActiveWebPushUserId(userId: string | null): void {
  if (activeWebPushUserId === userId) return
  activeWebPushUserId = userId
  webPushEnableEpoch += 1
}

function setWebPushOwnerId(userId: string | null): void {
  try {
    if (userId) window.localStorage.setItem(PUSH_OWNER_KEY, userId)
    else window.localStorage.removeItem(PUSH_OWNER_KEY)
  } catch {
    return
  }
}

async function getRootServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  return (await navigator.serviceWorker.getRegistration("/")) ?? null
}

export async function getLocalWebPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getRootServiceWorker()
  return registration?.pushManager.getSubscription() ?? null
}

async function closeWebPushNotifications(registration: ServiceWorkerRegistration | null): Promise<void> {
  if (!registration) return
  const notifications = await registration.getNotifications()
  notifications.forEach((notification) => notification.close())
}

async function unsubscribeLocally(registration: ServiceWorkerRegistration, subscription: PushSubscription): Promise<void> {
  await subscription.unsubscribe()
  const remaining = await registration.pushManager.getSubscription()
  if (remaining?.endpoint === subscription.endpoint) throw new Error("The browser kept this push subscription active")
}

function usesApplicationServerKey(subscription: PushSubscription, publicKey: string): boolean {
  const existingKey = subscription.options.applicationServerKey
  if (!existingKey) return false
  const expectedKey = decodeWebPushPublicKey(publicKey)
  const existingBytes = new Uint8Array(existingKey)
  return existingBytes.length === expectedKey.length
    && existingBytes.every((byte, index) => byte === expectedKey[index])
}

export async function removeLocalWebPushSubscription(): Promise<void> {
  const registration = await getRootServiceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  let localError: unknown = null
  try {
    if (registration && subscription) await unsubscribeLocally(registration, subscription)
  } catch (cause) {
    localError = cause
  }
  setWebPushOwnerId(null)
  let notificationError: unknown = null
  try {
    await closeWebPushNotifications(registration)
  } catch (cause) {
    notificationError = cause
  }
  if (localError) throw localError
  if (notificationError) throw notificationError
}

export async function reconcileWebPushOwner(userId: string | null): Promise<void> {
  setActiveWebPushUserId(userId)
  const subscription = await getLocalWebPushSubscription()
  const ownerId = getWebPushOwnerId()
  if (!subscription) {
    if (ownerId) setWebPushOwnerId(null)
    return
  }
  if (userId && ownerId === userId) return
  await removeLocalWebPushSubscription()
}

async function enableWebPushForUserOperation(userId: string, publicKey: string): Promise<string> {
  const environment = getWebPushEnvironment()
  if (!environment.supported) throw new Error("Web Push is not supported in this browser")
  if (activeWebPushUserId === undefined) setActiveWebPushUserId(userId)
  if (activeWebPushUserId !== userId) throw new Error("The signed-in account changed before notifications were enabled")
  const operationEpoch = webPushEnableEpoch
  function assertCurrentAccount(): void {
    if (activeWebPushUserId !== userId || operationEpoch !== webPushEnableEpoch) {
      throw new Error("The signed-in account changed before notifications were enabled")
    }
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
  assertCurrentAccount()
  await navigator.serviceWorker.ready
  assertCurrentAccount()

  let subscription = await registration.pushManager.getSubscription()
  assertCurrentAccount()
  const ownerId = getWebPushOwnerId()
  if (subscription && ownerId !== userId) {
    await removeLocalWebPushSubscription()
    assertCurrentAccount()
    subscription = null
  }

  if (subscription && !usesApplicationServerKey(subscription, publicKey)) {
    let serverError: unknown = null
    try {
      await moc.push.unsubscribe(subscription.endpoint)
    } catch (cause) {
      serverError = cause
    }
    let localError: unknown = null
    try {
      await unsubscribeLocally(registration, subscription)
    } catch (cause) {
      localError = cause
    }
    setWebPushOwnerId(null)
    if (serverError) throw serverError
    if (localError) throw localError
    subscription = null
  }

  let createdSubscription = false
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeWebPushPublicKey(publicKey),
    })
    createdSubscription = true
    if (activeWebPushUserId !== userId || operationEpoch !== webPushEnableEpoch) {
      await unsubscribeLocally(registration, subscription).catch(() => undefined)
      throw new Error("The signed-in account changed before notifications were enabled")
    }
  }

  try {
    await moc.push.subscribe(subscription.toJSON())
  } catch (error) {
    if (createdSubscription) await unsubscribeLocally(registration, subscription).catch(() => undefined)
    throw error
  }

  if (activeWebPushUserId !== userId || operationEpoch !== webPushEnableEpoch) {
    await unsubscribeLocally(registration, subscription).catch(() => undefined)
    await moc.push.unsubscribe(subscription.endpoint).catch(() => undefined)
    throw new Error("The signed-in account changed before notifications were enabled")
  }

  setWebPushOwnerId(userId)
  return subscription.endpoint
}

export function enableWebPushForUser(userId: string, publicKey: string): Promise<string> {
  const operation = enableWebPushForUserOperation(userId, publicKey)
  pendingWebPushEnables.add(operation)
  void operation.then(
    () => pendingWebPushEnables.delete(operation),
    () => pendingWebPushEnables.delete(operation),
  )
  return operation
}

export async function disableWebPush(options: { signingOut?: boolean } = {}): Promise<void> {
  webPushEnableEpoch += 1
  if (options.signingOut) activeWebPushUserId = null
  const registration = await getRootServiceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint ?? null
  let localError: unknown = null

  if (registration && subscription) {
    try {
      await unsubscribeLocally(registration, subscription)
    } catch (cause) {
      localError = cause
    }
  }
  setWebPushOwnerId(null)
  let notificationError: unknown = null
  try {
    await closeWebPushNotifications(registration)
  } catch (cause) {
    notificationError = cause
  }

  if (options.signingOut) {
    await Promise.allSettled([...pendingWebPushEnables])
  }

  let serverError: unknown = null
  if (endpoint) {
    try {
      await moc.push.unsubscribe(endpoint)
    } catch (cause) {
      serverError = cause
    }
  }

  if (serverError) throw serverError
  if (localError) throw localError
  if (notificationError) throw notificationError
}
