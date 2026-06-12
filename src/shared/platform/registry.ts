import type { PlatformAdapterRegistry } from "./types"

export function createPlatformAdapterRegistry(
  adapters: PlatformAdapterRegistry
): Readonly<PlatformAdapterRegistry> {
  return Object.freeze({ ...adapters })
}

export function replacePlatformAdapter<K extends keyof PlatformAdapterRegistry>(
  registry: Readonly<PlatformAdapterRegistry>,
  key: K,
  adapter: PlatformAdapterRegistry[K]
): Readonly<PlatformAdapterRegistry> {
  return Object.freeze({ ...registry, [key]: adapter })
}
