/**
 * Makes saves show up in the lists the moment the request is sent.
 *
 * Pages keep their own SWR keys. After a create, edit or delete of a known
 * collection, this updates those cached lists (and the open record) directly.
 * The screen does not wait for a second refetch. If the server rejects the
 * change, the previous cache entries are put back.
 */

export const INSTANT_COLLECTIONS = new Set([
  'jugadores',
  'sesiones',
  'partidos',
  'rivales',
  'microciclos',
  'tareas',
  'convocatorias',
  'informes',
  'presentaciones',
  'equipos',
  'descansos',
  'medico',
  'tactical-boards',
  'game-models',
  'abp',
])

const NEUTRAL_PARAMS = new Set([
  'equipo_id',
  'page',
  'limit',
  'orden',
  'direccion',
  'organizacion_completa',
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type WriteOp = {
  method: WriteMethod
  path: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  result?: unknown
}

type CacheEntry = { key: string; data: unknown }

export type InstantStore = {
  entries(): CacheEntry[]
  write(key: string, data: unknown): void
}

type ParsedPath = { collection: string; id?: string; sub: boolean }

export function parseInstantPath(path: string): ParsedPath | null {
  const parts = path.split('?')[0].split('/').filter(Boolean)
  if (!parts.length || !INSTANT_COLLECTIONS.has(parts[0])) return null
  if (parts.length === 1) return { collection: parts[0], sub: false }
  if (UUID.test(parts[1])) {
    return { collection: parts[0], id: parts[1], sub: parts.length > 2 }
  }
  return { collection: parts[0], sub: true }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asEntity(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return null
  return value
}

export function entityFromResult(result: unknown, parentId?: string): Record<string, unknown> | null {
  const direct = asEntity(result)
  if (direct && (!parentId || direct.id === parentId)) return direct
  if (!isRecord(result)) return null
  for (const key of ['jugador', 'sesion', 'partido', 'data']) {
    const nested = asEntity(result[key])
    if (nested && (!parentId || nested.id === parentId)) return nested
  }
  return null
}

export function listParams(key: string, collection: string): URLSearchParams | null {
  if (key === `/${collection}`) return new URLSearchParams()
  const prefix = `/${collection}?`
  if (!key.startsWith(prefix)) return null
  return new URLSearchParams(key.slice(prefix.length))
}

function isBroadList(params: URLSearchParams): boolean {
  for (const name of Array.from(params.keys())) {
    if (!NEUTRAL_PARAMS.has(name)) return false
  }
  const page = params.get('page')
  return !page || page === '1'
}

function equipoAllows(params: URLSearchParams, entity: Record<string, unknown>): boolean {
  const wanted = params.get('equipo_id')
  if (!wanted) return true
  const have = entity.equipo_id
  if (typeof have !== 'string' || !have) return true
  return have === wanted
}

function isListPayload(data: unknown): data is { data: Record<string, unknown>[]; total?: number } {
  return isRecord(data) && Array.isArray(data.data)
}

function plainObject(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function paintRecord(data: unknown, id: string, patch: Record<string, unknown>): unknown | null {
  if (!isRecord(data)) return null
  if (data.id === id) {
    if (Object.entries(patch).every(([key, value]) => data[key] === value)) return null
    return { ...data, ...patch }
  }
  let changed = false
  const next: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value) || value.id !== id) continue
    if (Object.entries(patch).every(([field, fieldValue]) => value[field] === fieldValue)) continue
    next[key] = { ...value, ...patch }
    changed = true
  }
  return changed ? next : null
}

function patchOnto(current: Record<string, unknown>, op: WriteOp, strict: boolean): { next: Record<string, unknown>; changed: boolean } {
  const patch: Record<string, unknown> = {}
  const sources = [plainObject(op.body), op.params].filter(Boolean) as Record<string, unknown>[]
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (key === 'id' || value === undefined) continue
      if (strict && !(key in current)) continue
      if (current[key] === value) continue
      patch[key] = value
    }
  }
  if (!Object.keys(patch).length) return { next: current, changed: false }
  return { next: { ...current, ...patch }, changed: true }
}

function upsertList(
  payload: { data: Record<string, unknown>[]; total?: number },
  entity: Record<string, unknown>,
  allowInsert: boolean,
): { data: Record<string, unknown>[]; total?: number } | null {
  const id = entity.id
  const index = payload.data.findIndex((row) => row?.id === id)
  if (index >= 0) {
    const data = payload.data.slice()
    data[index] = { ...payload.data[index], ...entity }
    return { ...payload, data }
  }
  if (!allowInsert) return null
  const total = typeof payload.total === 'number' ? payload.total + 1 : payload.total
  return { ...payload, data: [entity, ...payload.data], total }
}

function removeFromList(
  payload: { data: Record<string, unknown>[]; total?: number },
  id: string,
): { data: Record<string, unknown>[]; total?: number } | null {
  if (!payload.data.some((row) => row?.id === id)) return null
  const total = typeof payload.total === 'number' ? Math.max(0, payload.total - 1) : payload.total
  return { ...payload, data: payload.data.filter((row) => row?.id !== id), total }
}

export type AppliedWrite = {
  previous: CacheEntry[]
  refreshCollection: string | null
}

/**
 * Apply one phase of a write to the store.
 * `start` is the optimistic update (before the response).
 * `commit` folds the server payload in.
 */
export function applyInstantWrite(store: InstantStore, phase: 'start' | 'commit', op: WriteOp): AppliedWrite {
  const parsed = parseInstantPath(op.path)
  if (!parsed) return { previous: [], refreshCollection: null }

  const previous: CacheEntry[] = []
  const seen = new Set<string>()
  const remember = (key: string, data: unknown) => {
    if (seen.has(key)) return
    seen.add(key)
    previous.push({ key, data })
  }
  const put = (key: string, next: unknown, current: unknown) => {
    remember(key, current)
    store.write(key, next)
  }

  const entity = phase === 'commit' ? entityFromResult(op.result, parsed.id) : null
  const exact = !parsed.sub
  let refreshCollection: string | null = null

  if (phase === 'commit' && parsed.sub && !entity) {
    refreshCollection = parsed.collection
  }

  for (const entry of store.entries()) {
    const params = listParams(entry.key, parsed.collection)
    if (params && isListPayload(entry.data)) {
      if (phase === 'start' && exact && op.method === 'DELETE' && parsed.id) {
        const next = removeFromList(entry.data, parsed.id)
        if (next) put(entry.key, next, entry.data)
        continue
      }
      if (phase === 'start' && exact && (op.method === 'PUT' || op.method === 'PATCH') && parsed.id) {
        const row = entry.data.data.find((item) => item?.id === parsed.id)
        if (!row) continue
        const merged = patchOnto(row, op, false)
        if (!merged.changed) continue
        const next = upsertList(entry.data, { ...merged.next, id: parsed.id }, false)
        if (next) put(entry.key, next, entry.data)
        continue
      }
      if (phase === 'start' && parsed.sub && parsed.id && op.method !== 'DELETE') {
        const row = entry.data.data.find((item) => item?.id === parsed.id)
        if (!row) continue
        // A POST body is the child record, not a patch of the parent. Query
        // params (for example estado) still are.
        const merged = patchOnto(row, op.method === 'POST' ? { ...op, body: undefined } : op, true)
        if (!merged.changed) continue
        const next = upsertList(entry.data, { ...merged.next, id: parsed.id }, false)
        if (next) put(entry.key, next, entry.data)
        continue
      }
      if (phase === 'commit' && entity && (exact || entity.id === parsed.id)) {
        const allowInsert = exact && (op.method === 'POST' || op.method === 'PUT') && isBroadList(params) && equipoAllows(params, entity)
        const next = upsertList(entry.data, entity, allowInsert)
        if (next) put(entry.key, next, entry.data)
      }
      continue
    }

    if (!parsed.id) continue
    const detailKey = `/${parsed.collection}/${parsed.id}`
    // Vista completa: { microciclo: { id, plan_ct } }. El guardado tiene que
    // pintar dentro, o al volver a entrar se ve el plan de antes.
    if (entry.key.startsWith(`${detailKey}/`)) {
      const patch = phase === 'commit' && entity && entity.id === parsed.id
        ? entity
        : phase === 'start' && exact && (op.method === 'PUT' || op.method === 'PATCH')
          ? plainObject(op.body)
          : null
      if (patch) {
        const next = paintRecord(entry.data, parsed.id, patch)
        if (next) put(entry.key, next, entry.data)
      }
      continue
    }
    if (entry.key !== detailKey && !entry.key.startsWith(`${detailKey}?`)) continue
    if (!isRecord(entry.data) || (entry.data.id && entry.data.id !== parsed.id)) continue

    if (phase === 'start' && exact && op.method === 'DELETE') continue
    if (phase === 'start' && parsed.sub && op.method !== 'DELETE') {
      const merged = patchOnto(entry.data, op.method === 'POST' ? { ...op, body: undefined } : op, true)
      if (merged.changed) put(entry.key, merged.next, entry.data)
      continue
    }
    if (phase === 'start' && exact && (op.method === 'PUT' || op.method === 'PATCH')) {
      const merged = patchOnto(entry.data, op, false)
      if (merged.changed) put(entry.key, merged.next, entry.data)
      continue
    }
    if (phase === 'commit' && entity && entity.id === parsed.id) {
      put(entry.key, { ...entry.data, ...entity }, entry.data)
    }
  }

  if (phase === 'commit' && entity && parsed.id && entity.id === parsed.id) {
    const detailKey = `/${parsed.collection}/${parsed.id}`
    if (!seen.has(detailKey)) {
      const current = store.entries().find((entry) => entry.key === detailKey)?.data
      put(detailKey, isRecord(current) ? { ...current, ...entity } : entity, current)
    }
  }

  if (phase === 'commit' && exact && op.method === 'POST' && entity && !parsed.id) {
    const detailKey = `/${parsed.collection}/${String(entity.id)}`
    if (!seen.has(detailKey)) put(detailKey, entity, undefined)
  }

  return { previous, refreshCollection }
}

