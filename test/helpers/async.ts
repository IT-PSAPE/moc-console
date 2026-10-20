export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((complete) => { resolve = complete })
  return { promise, resolve }
}

export async function settle(): Promise<void> {
  for (let index = 0; index < 10; index += 1) await Promise.resolve()
}
