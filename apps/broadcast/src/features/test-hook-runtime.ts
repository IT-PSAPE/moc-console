type StateSetter<T> = T | ((current: T) => T)
type EffectCallback = () => void | (() => void)
type MemoSlot = { deps: readonly unknown[] | undefined, value: unknown }
type EffectSlot = { cleanup?: () => void, deps: readonly unknown[] | undefined }

function depsChanged(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined) {
  if (previous === undefined || next === undefined) {
    return true
  }

  if (previous.length !== next.length) {
    return true
  }

  return previous.some((value, index) => !Object.is(value, next[index]))
}

let activeRuntime: HookRuntime<unknown, unknown> | null = null

function getActiveRuntime() {
  if (!activeRuntime) {
    throw new Error("Hooks can only run while a test runtime is rendering.")
  }

  return activeRuntime
}

export function createMockReactModule() {
  return {
    useCallback<T>(callback: T, deps: readonly unknown[] | undefined) {
      return getActiveRuntime().useMemo(() => callback, deps)
    },
    useEffect(effect: EffectCallback, deps?: readonly unknown[]) {
      return getActiveRuntime().useEffect(effect, deps)
    },
    useMemo<T>(factory: () => T, deps: readonly unknown[] | undefined) {
      return getActiveRuntime().useMemo(factory, deps)
    },
    useRef<T>(initialValue: T) {
      return getActiveRuntime().useRef(initialValue)
    },
    useState<T>(initialValue: T | (() => T)) {
      return getActiveRuntime().useState(initialValue)
    },
  }
}

export class HookRuntime<Props, Result> {
  private cursor = 0
  private readonly effects: Array<EffectSlot | undefined> = []
  private readonly memos: Array<MemoSlot | undefined> = []
  private readonly refs: Array<{ current: unknown } | undefined> = []
  private readonly renderFunction: (props: Props) => Result
  private readonly states: unknown[] = []
  private pendingEffects: Array<{ deps: readonly unknown[] | undefined, effect: EffectCallback, index: number }> = []
  private props: Props | null = null

  result: Result | null = null

  constructor(renderFunction: (props: Props) => Result) {
    this.renderFunction = renderFunction
  }

  render(props: Props) {
    this.props = props
    this.cursor = 0
    this.pendingEffects = []
    activeRuntime = this as HookRuntime<unknown, unknown>
    this.result = this.renderFunction(props)
    activeRuntime = null
    this.flushEffects()
    return this.result
  }

  rerender() {
    if (this.props === null) {
      throw new Error("Cannot rerender before the first render.")
    }

    return this.render(this.props)
  }

  unmount() {
    for (const effect of this.effects) {
      effect?.cleanup?.()
    }
  }

  useEffect(effect: EffectCallback, deps: readonly unknown[] | undefined) {
    const index = this.cursor++
    const current = this.effects[index]
    if (!current || depsChanged(current.deps, deps)) {
      this.pendingEffects.push({ deps, effect, index })
    }
  }

  useMemo<T>(factory: () => T, deps: readonly unknown[] | undefined) {
    const index = this.cursor++
    const current = this.memos[index]
    if (!current || depsChanged(current.deps, deps)) {
      const value = factory()
      this.memos[index] = { deps, value }
      return value
    }

    return current.value as T
  }

  useRef<T>(initialValue: T) {
    const index = this.cursor++
    const current = this.refs[index]
    if (current) {
      return current as { current: T }
    }

    const ref = { current: initialValue }
    this.refs[index] = ref
    return ref
  }

  useState<T>(initialValue: T | (() => T)) {
    const index = this.cursor++
    if (!(index in this.states)) {
      this.states[index] = typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue
    }

    const setState = (nextValue: StateSetter<T>) => {
      const current = this.states[index] as T
      this.states[index] = typeof nextValue === "function"
        ? (nextValue as (value: T) => T)(current)
        : nextValue
    }

    return [this.states[index] as T, setState] as const
  }

  private flushEffects() {
    for (const pendingEffect of this.pendingEffects) {
      this.effects[pendingEffect.index]?.cleanup?.()
      const cleanup = pendingEffect.effect()
      this.effects[pendingEffect.index] = {
        cleanup: typeof cleanup === "function" ? cleanup : undefined,
        deps: pendingEffect.deps,
      }
    }
  }
}
