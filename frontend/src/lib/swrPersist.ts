import type { Cache } from 'swr'
import { useAuthStore } from '@/stores/authStore'
import {
  buildStorageKey,
  parseEntries,
  serializeEntries,
  wipeOtherOwners,
  wipeStorage,
  type PersistEntry,
} from './swrPersistCore'

type CacheState = { data?: unknown; error?: unknown; _k?: unknown }

function currentOwner(): string | null {
  const user = useAuthStore.getState().user as { id?: unknown; organizacion_id?: unknown } | null
  return buildStorageKey(user?.id, user?.organizacion_id)
}

let installed = false

/**
 * Provider de SWR que devuelve la MISMA caché por defecto, ya hidratada.
 *
 * Es deliberado: `mutate` global, `preload` y `instantCache` (swr/_internal)
 * trabajan sobre la caché por defecto. Un Map nuevo las dejaría escribiendo en
 * un sitio que ningún componente lee.
 *
 * - Guardado ligado a la cuenta (id de usuario + organización).
 * - Se borra todo al cerrar sesión o al cambiar de cuenta (suscripción al store de auth).
 * - Sin usuario identificado no se guarda nada.
 * - localStorage bloqueado o roto: no pasa nada, la app funciona como antes.
 */
export function persistentCacheProvider(cache: Readonly<Cache>): Cache {
  const parent = cache as Cache
  if (typeof window === 'undefined' || installed) return parent

  let storage: Storage
  try {
    storage = window.localStorage
    if (!storage) return parent
  } catch {
    return parent
  }
  installed = true

  let owner = currentOwner()
  const meta = new Map<string, { data: unknown; t: number }>()

  try {
    if (owner) {
      wipeOtherOwners(storage, owner)
      const entries = parseEntries(storage.getItem(owner), Date.now())
      for (const { key, data, t } of entries) {
        if (parent.get(key)) continue
        // _k: swr/_internal mutate con filtro e instantCache lo leen.
        parent.set(key, { data, _k: key } as never)
        meta.set(key, { data, t })
      }
    } else {
      wipeStorage(storage)
    }
  } catch {
    // seguimos sin caché persistida
  }

  const save = () => {
    try {
      if (!owner || owner !== currentOwner()) return
      const now = Date.now()
      const entries: PersistEntry[] = []
      const seen = new Set<string>()
      for (const key of Array.from(parent.keys())) {
        const state = parent.get(key) as CacheState | undefined
        if (!state || state.error !== undefined || state.data === undefined) continue
        seen.add(key)
        const known = meta.get(key)
        let t = now
        if (known && known.data === state.data) t = known.t
        else meta.set(key, { data: state.data, t })
        entries.push({ key, data: state.data, t })
      }
      for (const key of Array.from(meta.keys())) if (!seen.has(key)) meta.delete(key)

      const json = serializeEntries(entries)
      if (json === null) storage.removeItem(owner)
      else storage.setItem(owner, json)
    } catch {
      // cuota llena u otro fallo: quitamos lo nuestro para no dejar datos a medias
      try {
        if (owner) storage.removeItem(owner)
      } catch {
        // ignorar
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save()
  })
  window.addEventListener('pagehide', save)

  // Cierre de sesión o cambio de cuenta: fuera todo, en memoria y en disco.
  useAuthStore.subscribe(() => {
    const next = currentOwner()
    if (next === owner) return
    if (owner !== null) {
      for (const key of Array.from(parent.keys())) parent.delete(key)
      meta.clear()
      try {
        wipeStorage(storage)
      } catch {
        // ignorar
      }
    }
    owner = next
  })

  return parent
}
