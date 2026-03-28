import type { PortalConfig } from '@/types'

const registry: PortalConfig[] = []

export function registerPortal(config: PortalConfig) {
  const index = registry.findIndex((p) => p.id === config.id)
  if (index >= 0) {
    registry[index] = config
  } else {
    registry.push(config)
  }
}

export function getPortals(): PortalConfig[] {
  return [...registry]
}

export function getPortalById(id: string): PortalConfig | undefined {
  return registry.find((p) => p.id === id)
}
