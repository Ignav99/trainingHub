/**
 * Lógica pura de la caché persistente de SWR (sin React, sin SWR, sin window).
 * El almacenamiento se inyecta, así se prueba con node --test.
 */

export const PERSIST_PREFIX = 'kabine-swr-v1:'
export const PERSIST_VERSION = 1
/** Caducidad de una entrada guardada. */
export const PERSIST_TTL_MS = 24 * 60 * 60 * 1000
/** Tope del JSON completo (caracteres). localStorage admite ~5M; dejamos holgura. */
export const PERSIST_MAX_CHARS = 1_500_000
/** Una entrada más grande que esto no se guarda nunca. */
export const PERSIST_MAX_ENTRY_CHARS = 300_000

/**
 * Claves que nunca se persisten. Ante la duda se excluye: salud, medios pesados,
 * sesión. Se compara en minúsculas y sin tildes.
 */
const EXCLUDED_FRAGMENTS = [
  // datos personales de jugadores (pueden llevar estado de lesión): no se guardan en disco
  'jugador',
  'dashboard/plantilla',
  'carga/',
  'medic',
  'enfermer',
  'lesion',
  'salud',
  'wellness',
  'nutricion',
  'composicion',
  'suplemento',
  'antropo',
  'rehab',
  'fisio',
  'video',
  'blob',
  'download',
  'descarg',
  'export',
  'upload',
  'pdf',
  'zip',
  'auth',
  'token',
  'password',
]

function normalizar(key: string): string {
  return key.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Solo claves de ruta API en texto (`/algo?x=y`). Fuera claves internas de SWR ($inf$, $sub$, hashes). */
export function isPersistableKey(key: unknown): key is string {
  if (typeof key !== 'string' || !key.startsWith('/')) return false
  const k = normalizar(key)
  return !EXCLUDED_FRAGMENTS.some((frag) => k.includes(frag))
}

/** Clave de almacenamiento ligada a la cuenta. Sin usuario no hay clave (no se persiste). */
export function buildStorageKey(userId: unknown, orgId?: unknown): string | null {
  if (typeof userId !== 'string' || userId.length === 0) return null
  const org = typeof orgId === 'string' && orgId.length > 0 ? orgId : '-'
  return `${PERSIST_PREFIX}${org}:${userId}`
}

export interface PersistEntry {
  key: string
  data: unknown
  /** Momento (ms) en que se obtuvo el dato. */
  t: number
}

interface Payload {
  v: number
  e: Record<string, { d: unknown; t: number }>
}

/**
 * Serializa respetando límites. Si el total supera `maxChars`, descarta las entradas
 * más grandes hasta que quepa. Devuelve null si no queda nada que guardar.
 */
export function serializeEntries(
  entries: PersistEntry[],
  opts: { maxChars?: number; maxEntryChars?: number } = {},
): string | null {
  const maxChars = opts.maxChars ?? PERSIST_MAX_CHARS
  const maxEntry = opts.maxEntryChars ?? PERSIST_MAX_ENTRY_CHARS

  const sized: { entry: PersistEntry; size: number }[] = []
  for (const entry of entries) {
    if (!isPersistableKey(entry.key) || entry.data === undefined) continue
    let size: number
    try {
      const json = JSON.stringify(entry.data)
      if (json === undefined) continue
      size = json.length + entry.key.length
    } catch {
      continue
    }
    if (size > maxEntry) continue
    sized.push({ entry, size })
  }
  if (sized.length === 0) return null

  // Más pequeñas primero: al llenar el presupuesto caen las más grandes.
  sized.sort((a, b) => a.size - b.size)
  const kept: PersistEntry[] = []
  let total = 64
  for (const { entry, size } of sized) {
    if (total + size + 24 > maxChars) break
    total += size + 24
    kept.push(entry)
  }
  if (kept.length === 0) return null

  const payload: Payload = { v: PERSIST_VERSION, e: {} }
  for (const entry of kept) payload.e[entry.key] = { d: entry.data, t: entry.t }
  try {
    return JSON.stringify(payload)
  } catch {
    return null
  }
}

/** Lee lo guardado: descarta versión distinta, formato roto, claves no persistibles y caducadas. */
export function parseEntries(
  raw: string | null,
  now: number,
  ttlMs: number = PERSIST_TTL_MS,
): PersistEntry[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object') return []
  const payload = parsed as Partial<Payload>
  if (payload.v !== PERSIST_VERSION || !payload.e || typeof payload.e !== 'object') return []

  const out: PersistEntry[] = []
  for (const [key, value] of Object.entries(payload.e)) {
    if (!isPersistableKey(key)) continue
    if (!value || typeof value !== 'object') continue
    const { d, t } = value as { d?: unknown; t?: unknown }
    if (d === undefined || d === null || typeof t !== 'number' || !Number.isFinite(t)) continue
    if (t > now + 60_000) continue // reloj raro: no confiar
    if (now - t > ttlMs) continue
    out.push({ key, data: d, t })
  }
  return out
}

export interface KeyValueStorage {
  readonly length: number
  key(index: number): string | null
  removeItem(key: string): void
}

function ownKeys(storage: KeyValueStorage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && k.startsWith(PERSIST_PREFIX)) keys.push(k)
  }
  return keys
}

/** Borra todas las cachés persistidas (de cualquier cuenta). Para cerrar sesión. */
export function wipeStorage(storage: KeyValueStorage): void {
  for (const k of ownKeys(storage)) {
    try {
      storage.removeItem(k)
    } catch {
      // sin permiso: nada más que hacer
    }
  }
}

/** Borra las cachés de otras cuentas, conservando `keep`. */
export function wipeOtherOwners(storage: KeyValueStorage, keep: string | null): void {
  for (const k of ownKeys(storage)) {
    if (k === keep) continue
    try {
      storage.removeItem(k)
    } catch {
      // ignorar
    }
  }
}
