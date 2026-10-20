import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { consoleQueryPolicy } from '../../../../../apps/console/src/lib/console-query-policy'

let tanstack: typeof import('@tanstack/react-query')
let client: import('@tanstack/react-query').QueryClient

beforeAll(async () => {
  // QueryObserver enables its real polling lifecycle only in a browser runtime.
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  tanstack = await import('@tanstack/react-query')
})
beforeEach(() => {
  vi.useFakeTimers()
  client = new tanstack.QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.mount()
  tanstack.focusManager.setFocused(true)
})
afterEach(() => {
  client.unmount()
  client.clear()
  tanstack.focusManager.setFocused(undefined)
  vi.useRealTimers()
})
afterAll(() => vi.unstubAllGlobals())

test('returning to fresh Telegram data renders cache without another network read', async () => {
  const queryKey = ['workspace', 'alpha', 'telegram-groups']
  const queryFn = vi.fn(async () => ['group'])
  const options = { ...consoleQueryPolicy('telegram-groups'), queryKey, queryFn }
  const first = new tanstack.QueryObserver(client, options)
  const stop = first.subscribe(() => undefined)
  await vi.advanceTimersByTimeAsync(0)
  stop()
  await vi.advanceTimersByTimeAsync(5_000)
  const returning = new tanstack.QueryObserver(client, options)
  const stopReturning = returning.subscribe(() => undefined)
  expect(returning.getCurrentResult().data).toEqual(['group'])
  expect(returning.getCurrentResult().isPending).toBe(false)
  expect(queryFn).toHaveBeenCalledTimes(1)
  stopReturning()
})

test('live data polls while visible, pauses when hidden, and stops after leaving the page', async () => {
  let revision = 0
  const queryFn = vi.fn(async () => ++revision)
  const observer = new tanstack.QueryObserver(client, {
    ...consoleQueryPolicy('telegram-groups'), queryKey: ['groups'], queryFn,
  })
  const stop = observer.subscribe(() => undefined)
  await vi.advanceTimersByTimeAsync(30_000)
  expect(observer.getCurrentResult().data).toBe(2)
  tanstack.focusManager.setFocused(false)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(queryFn).toHaveBeenCalledTimes(2)
  tanstack.focusManager.setFocused(true)
  await vi.advanceTimersByTimeAsync(0)
  expect(observer.getCurrentResult().data).toBe(3)
  stop()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(queryFn).toHaveBeenCalledTimes(3)
})

test('returning after the freshness window shows cached data while refreshing in background', async () => {
  const queryKey = ['workspace', 'alpha', 'users:managed']
  client.setQueryData(queryKey, ['known member'])
  await vi.advanceTimersByTimeAsync(31_000)
  const observer = new tanstack.QueryObserver(client, {
    ...consoleQueryPolicy('users:managed'), queryKey,
    queryFn: () => new Promise<string[]>(() => undefined),
  })
  const stop = observer.subscribe(() => undefined)
  expect(observer.getCurrentResult().data).toEqual(['known member'])
  expect(observer.getCurrentResult().isPending).toBe(false)
  expect(observer.getCurrentResult().isFetching).toBe(true)
  stop()
})

test('settings reuse five-minute data and explicit invalidation overrides that freshness', async () => {
  const queryKey = ['workspace', 'alpha', 'notification-settings']
  const queryFn = vi.fn(async () => ({ timezone: 'UTC' }))
  const observer = new tanstack.QueryObserver(client, {
    ...consoleQueryPolicy('notification-settings'), queryKey, queryFn,
  })
  const stop = observer.subscribe(() => undefined)
  await vi.advanceTimersByTimeAsync(120_000)
  expect(queryFn).toHaveBeenCalledTimes(1)
  await client.invalidateQueries({ queryKey })
  expect(queryFn).toHaveBeenCalledTimes(2)
  stop()
})

test('global collection observers do not become polling jobs after visiting their page', async () => {
  const queryFn = vi.fn(async () => ['request'])
  const observer = new tanstack.QueryObserver(client, {
    ...consoleQueryPolicy('requests:active'), queryKey: ['requests'], queryFn,
  })
  const stop = observer.subscribe(() => undefined)
  await vi.advanceTimersByTimeAsync(5 * 60_000)
  expect(queryFn).toHaveBeenCalledTimes(1)
  stop()
})
