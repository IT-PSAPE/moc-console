import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

const pushApi = vi.hoisted(() => ({
  config: vi.fn(),
  subscribe: vi.fn(),
  status: vi.fn(),
  unsubscribe: vi.fn(),
  test: vi.fn(),
}))

vi.mock("@/lib/moc-client", () => ({ moc: { push: pushApi } }))

import {
  disableWebPush,
  enableWebPushForUser,
  reconcileWebPushOwner,
  requestWebPushPermissionThenEnable,
} from "../../../apps/console/src/data/web-push"

function createStorage() {
  const values = new Map<string, string>()
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    },
  }
}

function installBrowser(subscription: { endpoint: string; unsubscribe: () => Promise<boolean> } | null) {
  let currentSubscription = subscription
  const notificationClose = vi.fn()
  const registration = {
    pushManager: {
      getSubscription: vi.fn(async () => currentSubscription),
    },
    getNotifications: vi.fn(async () => [{ close: notificationClose }]),
  }
  const storage = createStorage()
  vi.stubGlobal("window", { localStorage: storage.storage })
  vi.stubGlobal("navigator", {
    serviceWorker: { getRegistration: vi.fn(async () => registration) },
  })
  return {
    registration,
    storage: storage.values,
    notificationClose,
    setCurrentSubscription(next: typeof currentSubscription) { currentSubscription = next },
  }
}

describe("Console Web Push lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("starts the permission prompt before beginning subscription work", async () => {
    const order: string[] = []
    const permission = requestWebPushPermissionThenEnable(
      "default",
      () => {
        order.push("permission")
        return Promise.resolve("granted")
      },
      async () => { order.push("subscribe") },
    )

    expect(order).toEqual(["permission"])
    await permission
    expect(order).toEqual(["permission", "subscribe"])
  })

  test("still removes the browser subscription and visible notifications when the server is offline", async () => {
    const subscription = { endpoint: "https://push.example.test/subscription/1", unsubscribe: vi.fn(async () => true) }
    const browser = installBrowser(subscription)
    browser.storage.set("moc-console-push-owner", "user-a")
    browser.setCurrentSubscription(subscription)
    browser.registration.pushManager.getSubscription
      .mockResolvedValueOnce(subscription)
      .mockResolvedValueOnce(null)
    pushApi.unsubscribe.mockRejectedValue(new Error("offline"))

    await expect(disableWebPush()).rejects.toThrow("offline")

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(pushApi.unsubscribe).toHaveBeenCalledWith(subscription.endpoint)
    expect(browser.notificationClose).toHaveBeenCalledOnce()
    expect(browser.storage.has("moc-console-push-owner")).toBe(false)
  })

  test("unsubscribes an old account's local endpoint without associating it with the new account", async () => {
    const browserRef: { current: ReturnType<typeof installBrowser> | null } = { current: null }
    const subscription = {
      endpoint: "https://push.example.test/subscription/old-account",
      unsubscribe: vi.fn(async () => {
        browserRef.current?.setCurrentSubscription(null)
        return true
      }),
    }
    const browser = installBrowser(subscription)
    browserRef.current = browser
    browser.storage.set("moc-console-push-owner", "user-a")
    browser.setCurrentSubscription(subscription)

    await reconcileWebPushOwner("user-b")

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(browser.notificationClose).toHaveBeenCalledOnce()
    expect(browser.storage.has("moc-console-push-owner")).toBe(false)
    expect(pushApi.unsubscribe).not.toHaveBeenCalled()
  })

  test("does not report device cleanup as successful if the browser keeps the endpoint active", async () => {
    const subscription = { endpoint: "https://push.example.test/subscription/1", unsubscribe: vi.fn(async () => false) }
    const browser = installBrowser(subscription)
    browser.storage.set("moc-console-push-owner", "user-a")
    pushApi.unsubscribe.mockResolvedValue(undefined)

    await expect(disableWebPush()).rejects.toThrow("The browser kept this push subscription active")

    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
    expect(pushApi.unsubscribe).toHaveBeenCalledWith(subscription.endpoint)
    expect(browser.notificationClose).toHaveBeenCalledOnce()
  })

  test("sign-out waits for an in-flight subscribe before deleting the endpoint and signing out", async () => {
    const events: string[] = []
    let currentSubscription: PushSubscription | null = null
    let resolveServerSubscribe: () => void = () => undefined
    let notifySubscribeStarted: () => void = () => undefined
    const serverSubscribe = new Promise<void>((resolve) => { resolveServerSubscribe = resolve })
    const subscribeStarted = new Promise<void>((resolve) => { notifySubscribeStarted = resolve })
    const subscription = {
      endpoint: "https://push.example.test/subscription/sign-out-race",
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      unsubscribe: vi.fn(async () => {
        events.push("local-unsubscribe")
        currentSubscription = null
        return true
      }),
      toJSON: () => ({ endpoint: "https://push.example.test/subscription/sign-out-race", keys: { p256dh: "key", auth: "auth" } }),
    } as unknown as PushSubscription
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => currentSubscription),
        subscribe: vi.fn(async () => {
          currentSubscription = subscription
          return subscription
        }),
      },
      getNotifications: vi.fn(async () => []),
    }
    const storage = createStorage()
    vi.stubGlobal("window", {
      isSecureContext: true,
      Notification: { permission: "default" },
      PushManager: class PushManager {},
      localStorage: storage.storage,
    })
    vi.stubGlobal("navigator", {
      userAgent: "Linux",
      platform: "Linux",
      maxTouchPoints: 0,
      serviceWorker: {
        getRegistration: vi.fn(async () => registration),
        register: vi.fn(async () => registration),
        ready: Promise.resolve(registration),
      },
    })
    pushApi.subscribe.mockImplementation(async () => {
      events.push("server-subscribe-started")
      notifySubscribeStarted()
      await serverSubscribe
      events.push("server-subscribe-resolved")
      return { id: "subscription-id" }
    })
    pushApi.unsubscribe.mockImplementation(async () => {
      events.push("server-unsubscribe")
      return undefined
    })
    await reconcileWebPushOwner("user-race")

    const enablePromise = enableWebPushForUser("user-race", "AQID")
    await subscribeStarted
    const signOutPromise = (async () => {
      await disableWebPush({ signingOut: true })
      events.push("auth-sign-out")
    })()

    await vi.waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalledOnce())
    expect(events).not.toContain("server-unsubscribe")
    expect(events).not.toContain("auth-sign-out")

    resolveServerSubscribe()
    await expect(enablePromise).rejects.toThrow("The signed-in account changed")
    await signOutPromise

    expect(events.indexOf("server-subscribe-resolved")).toBeLessThan(events.indexOf("server-unsubscribe"))
    expect(events.at(-1)).toBe("auth-sign-out")
    expect(pushApi.unsubscribe).toHaveBeenCalledWith(subscription.endpoint)
  })

  test("push worker routes notification clicks only to the Console origin and does not intercept fetches", async () => {
    const listeners = new Map<string, (event: { notification: { data?: { url?: string }; close: () => void }; waitUntil: (promise: Promise<unknown>) => void }) => void>()
    const focus = vi.fn(async () => undefined)
    const navigate = vi.fn(async () => undefined)
    const openWindow = vi.fn(async () => undefined)
    const scope = {
      addEventListener: (type: string, listener: (event: { notification: { data?: { url?: string }; close: () => void }; waitUntil: (promise: Promise<unknown>) => void }) => void) => listeners.set(type, listener),
      location: { origin: "https://console.example.test", protocol: "https:" },
      clients: {
        matchAll: vi.fn(async () => [{ url: "https://console.example.test/", focus, navigate }]),
        openWindow,
      },
      registration: { showNotification: vi.fn(async () => undefined) },
      skipWaiting: vi.fn(async () => undefined),
      caches: { keys: vi.fn(async () => []), delete: vi.fn(async () => true) },
    }
    const worker = readFileSync(new URL("../../../apps/console/public/sw.js", import.meta.url), "utf8")
    runInNewContext(worker, { globalThis: scope, URL })

    expect(listeners.has("fetch")).toBe(false)
    const close = vi.fn()
    let clickWork: Promise<unknown> | undefined
    listeners.get("notificationclick")?.({
      notification: { data: { url: "https://attacker.example/steal" }, close },
      waitUntil: (promise) => { clickWork = promise },
    })
    await clickWork

    expect(close).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith("https://console.example.test/")
    expect(openWindow).not.toHaveBeenCalled()

    navigate.mockClear()
    let sameOriginClickWork: Promise<unknown> | undefined
    listeners.get("notificationclick")?.({
      notification: { data: { url: "https://console.example.test//evil.example/path" }, close: vi.fn() },
      waitUntil: (promise) => { sameOriginClickWork = promise },
    })
    await sameOriginClickWork
    expect(navigate).toHaveBeenCalledWith("https://console.example.test//evil.example/path")
  })
})
