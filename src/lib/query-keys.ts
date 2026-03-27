export const queryKeys = {
  requests: {
    all: ['requests'] as const,
    list: (filters?: Record<string, string>) => ['requests', 'list', filters] as const,
    detail: (id: string) => ['requests', 'detail', id] as const,
    support: () => ['requests', 'support'] as const,
  },
  equipment: {
    all: ['equipment'] as const,
    list: (filters?: Record<string, string>) => ['equipment', 'list', filters] as const,
    checkouts: () => ['equipment', 'checkouts'] as const,
  },
  media: {
    all: ['media'] as const,
    library: (filters?: Record<string, string>) => ['media', 'library', filters] as const,
    queue: (broadcastId?: string) => ['media', 'queue', broadcastId] as const,
  },
  broadcasts: {
    all: ['broadcasts'] as const,
    list: (filters?: Record<string, string>) => ['broadcasts', 'list', filters] as const,
  },
  cueEvents: {
    all: ['cue-events'] as const,
    list: () => ['cue-events', 'list'] as const,
    detail: (id: string) => ['cue-events', 'detail', id] as const,
  },
}
