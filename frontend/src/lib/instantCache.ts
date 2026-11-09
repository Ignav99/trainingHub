import { cache as swrCache, mutate } from 'swr/_internal'
import { api, registerInstantCache } from '@/lib/api/client'
import { applyInstantWrite, listParams, type InstantStore, type WriteOp } from './instantCacheCore'

const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleListRefresh(collection: string) {
  const pending = refreshTimers.get(collection)
  if (pending) clearTimeout(pending)
  refreshTimers.set(collection, setTimeout(() => {
    refreshTimers.delete(collection)
    void refreshCollectionLists(collection)
  }, 350))
}

async function refreshCollectionLists(collection: string) {
  const keys = swrStore.entries()
    .map((entry) => entry.key)
    .filter((key) => listParams(key, collection))
  await Promise.all(keys.map(async (key) => {
    const [path, query = ''] = key.split('?')
    const params: Record<string, string> = {}
    new URLSearchParams(query).forEach((value, name) => {
      params[name] = value
    })
    try {
      const data = await api.get(path, Object.keys(params).length ? { params } : undefined)
      swrStore.write(key, data)
    } catch {
      // The list already shows the last confirmed data.
    }
  }))
}

const swrStore: InstantStore = {
  entries() {
    const out: { key: string; data: unknown }[] = []
    for (const hashed of Array.from(swrCache.keys())) {
      const state = swrCache.get(hashed) as { _k?: unknown; data?: unknown } | undefined
      if (!state || typeof state._k !== 'string') continue
      out.push({ key: state._k, data: state.data })
    }
    return out
  },
  write(key, data) {
    void mutate(key, data, { revalidate: false })
  },
}

export function startInstantWrite(op: WriteOp): { rollback(): void } {
  const applied = applyInstantWrite(swrStore, 'start', op)
  let rolled = false
  return {
    rollback() {
      if (rolled) return
      rolled = true
      for (const entry of applied.previous) {
        swrStore.write(entry.key, entry.data)
      }
    },
  }
}

export function commitInstantWrite(op: WriteOp): void {
  const applied = applyInstantWrite(swrStore, 'commit', op)
  if (applied.refreshCollection) scheduleListRefresh(applied.refreshCollection)
}

let installed = false

export function installInstantCache() {
  if (installed || typeof window === 'undefined') return
  installed = true
  registerInstantCache({
    start: startInstantWrite,
    commit: commitInstantWrite,
  })
}
