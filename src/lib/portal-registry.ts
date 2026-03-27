import type { PortalConfig } from '@/types'

const registry: PortalConfig[] = []

export function registerPortal(config: PortalConfig) {
  const exists = registry.find((p) => p.id === config.id)
  if (!exists) {
    registry.push(config)
  }
}

export function getPortals(): PortalConfig[] {
  return [...registry]
}

export function getPortalById(id: string): PortalConfig | undefined {
  return registry.find((p) => p.id === id)
}
