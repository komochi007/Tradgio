import type { PlatformAdapterRegistry, PwaUpdateAdapter, PwaUpdateEvent } from "./types"

export type AdapterCall = {
  adapter: keyof PlatformAdapterRegistry
  method: string
  args: unknown[]
}

export function createPwaUpdateTestDouble(calls: AdapterCall[]): PwaUpdateAdapter & {
  emit(event: PwaUpdateEvent): void
} {
  const listeners = new Set<(event: PwaUpdateEvent) => void>()

  return {
    async register(options) {
      if (options?.signal?.aborted) throw new DOMException("操作已取消", "AbortError")
      calls.push({ adapter: "pwaUpdate", method: "register", args: [options] })
    },
    async check(options) {
      if (options?.signal?.aborted) throw new DOMException("操作已取消", "AbortError")
      calls.push({ adapter: "pwaUpdate", method: "check", args: [options] })
    },
    subscribe(listener) {
      listeners.add(listener)
      calls.push({ adapter: "pwaUpdate", method: "subscribe", args: [] })
      return () => listeners.delete(listener)
    },
    async activateWaiting(options) {
      if (options?.signal?.aborted) throw new DOMException("操作已取消", "AbortError")
      calls.push({ adapter: "pwaUpdate", method: "activateWaiting", args: [options] })
    },
    emit(event) {
      listeners.forEach((listener) => listener(event))
    },
  }
}

export function createPlatformAdapterTestRegistry(
  overrides: Partial<PlatformAdapterRegistry>
): PlatformAdapterRegistry {
  return new Proxy(overrides, {
    get(target, key) {
      if (key in target) return target[key as keyof PlatformAdapterRegistry]
      throw new Error(`测试未配置 Adapter: ${String(key)}`)
    },
  }) as PlatformAdapterRegistry
}
