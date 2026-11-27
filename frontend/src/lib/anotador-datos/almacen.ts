/**
 * Almacenes de bajo nivel (clave/valor por "store"). Misma interfaz para
 * IndexedDB, localStorage y memoria (tests). Sin dependencias de la app.
 */

export type NombreStore = 'partidos' | 'journal' | 'outbox' | 'meta'
export const STORES: NombreStore[] = ['partidos', 'journal', 'outbox', 'meta']
export const NOMBRE_BD = 'kabine-anotador'

export interface Almacen {
  tipo: 'indexeddb' | 'localstorage' | 'memoria'
  get(store: NombreStore, key: string): Promise<unknown>
  put(store: NombreStore, key: string, value: unknown): Promise<void>
  delete(store: NombreStore, key: string): Promise<void>
  /** Registros cuya clave empieza por `prefix`, ordenados por clave. */
  listar(store: NombreStore, prefix?: string): Promise<{ key: string; value: unknown }[]>
}

/** Marca de un valor ilegible (JSON roto): el diario lo pone en cuarentena. */
export interface Corrupto {
  __corrupto: string
}

// ------------------------------------------------------------------ memoria

export interface AlmacenMemoria extends Almacen {
  /** Simula un fallo de escritura (cuota llena, etc.). */
  romperEscrituras: boolean
  volcar(): Record<string, unknown>
}

export function crearAlmacenMemoria(): AlmacenMemoria {
  const datos = new Map<string, unknown>()
  const k = (s: string, key: string) => `${s}\u0000${key}`
  const a: AlmacenMemoria = {
    tipo: 'memoria',
    romperEscrituras: false,
    async get(store, key) {
      const v = datos.get(k(store, key))
      return v === undefined ? undefined : JSON.parse(JSON.stringify(v))
    },
    async put(store, key, value) {
      if (a.romperEscrituras) throw new Error('QuotaExceededError (simulado)')
      datos.set(k(store, key), JSON.parse(JSON.stringify(value)))
    },
    async delete(store, key) {
      datos.delete(k(store, key))
    },
    async listar(store, prefix = '') {
      const pre = `${store}\u0000${prefix}`
      return Array.from(datos.keys())
        .filter((x) => x.startsWith(pre))
        .sort()
        .map((x) => ({ key: x.slice(store.length + 1), value: JSON.parse(JSON.stringify(datos.get(x))) }))
    },
    volcar() {
      const out: Record<string, unknown> = {}
      datos.forEach((v, key) => { out[key.replace('\u0000', ':')] = v })
      return out
    },
  }
  return a
}

// ------------------------------------------------------------- localStorage

export function crearAlmacenLocalStorage(ls: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>, ns = NOMBRE_BD): Almacen {
  const pre = (s: string) => `${ns}:${s}:`
  return {
    tipo: 'localstorage',
    async get(store, key) {
      const raw = ls.getItem(pre(store) + key)
      if (raw == null) return undefined
      try {
        return JSON.parse(raw)
      } catch {
        return { __corrupto: raw } as Corrupto
      }
    },
    async put(store, key, value) {
      ls.setItem(pre(store) + key, JSON.stringify(value))
    },
    async delete(store, key) {
      ls.removeItem(pre(store) + key)
    },
    async listar(store, prefix = '') {
      const p = pre(store)
      const keys: string[] = []
      for (let i = 0; i < ls.length; i++) {
        const name = ls.key(i)
        if (name && name.startsWith(p + prefix)) keys.push(name)
      }
      keys.sort()
      const out: { key: string; value: unknown }[] = []
      for (const name of keys) {
        const raw = ls.getItem(name)
        if (raw == null) continue
        let value: unknown
        try {
          value = JSON.parse(raw)
        } catch {
          value = { __corrupto: raw } as Corrupto
        }
        out.push({ key: name.slice(p.length), value })
      }
      return out
    },
  }
}

// ---------------------------------------------------------------- IndexedDB

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error || new Error('IndexedDB error'))
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error || new Error('IndexedDB tx error'))
    tx.onabort = () => rej(tx.error || new Error('IndexedDB tx abort'))
  })
}

export function abrirIndexedDB(factory: IDBFactory, nombre = NOMBRE_BD): Promise<Almacen> {
  return new Promise((resolve, reject) => {
    let open: IDBOpenDBRequest
    try {
      open = factory.open(nombre, 1)
    } catch (e) {
      reject(e)
      return
    }
    open.onupgradeneeded = () => {
      const db = open.result
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    }
    open.onblocked = () => reject(new Error('IndexedDB bloqueada'))
    open.onerror = () => reject(open.error || new Error('IndexedDB no disponible'))
    open.onsuccess = () => {
      const db = open.result
      db.onversionchange = () => db.close()
      const almacen: Almacen = {
        tipo: 'indexeddb',
        async get(store, key) {
          const tx = db.transaction(store, 'readonly')
          return req(tx.objectStore(store).get(key))
        },
        async put(store, key, value) {
          const tx = db.transaction(store, 'readwrite')
          tx.objectStore(store).put(value, key)
          await txDone(tx)
        },
        async delete(store, key) {
          const tx = db.transaction(store, 'readwrite')
          tx.objectStore(store).delete(key)
          await txDone(tx)
        },
        async listar(store, prefix = '') {
          const tx = db.transaction(store, 'readonly')
          const os = tx.objectStore(store)
          const range = prefix ? IDBKeyRange.bound(prefix, prefix + '￿') : undefined
          const keys = (await req(os.getAllKeys(range))) as string[]
          const vals = (await req(os.getAll(range))) as unknown[]
          return keys.map((key, i) => ({ key: String(key), value: vals[i] }))
        },
      }
      resolve(almacen)
    }
  })
}

// ------------------------------------------------------------ selección auto

async function sonda(a: Almacen): Promise<boolean> {
  try {
    await a.put('meta', '__sonda', { t: 1 })
    const v = (await a.get('meta', '__sonda')) as { t?: number } | undefined
    await a.delete('meta', '__sonda')
    return v?.t === 1
  } catch {
    return false
  }
}

export interface AbrirOpts {
  indexedDB?: IDBFactory | null
  localStorage?: Storage | null
  /** Para tests. */
  timeoutMs?: number
}

/** IndexedDB si funciona (se comprueba escribiendo y leyendo), si no localStorage, si no memoria (degradado). */
export async function abrirAlmacenAuto(opts: AbrirOpts = {}): Promise<{ almacen: Almacen; espejo: Almacen | null; degradado: boolean }> {
  const g = globalThis as unknown as { indexedDB?: IDBFactory; localStorage?: Storage }
  const idb = opts.indexedDB === undefined ? g.indexedDB : opts.indexedDB
  let ls: Storage | null = null
  try {
    ls = opts.localStorage === undefined ? g.localStorage ?? null : opts.localStorage
    if (ls) ls.getItem('__kabine')
  } catch {
    ls = null
  }
  const lsAlm = ls ? crearAlmacenLocalStorage(ls) : null
  const lsOk = lsAlm ? await sonda(lsAlm) : false

  if (idb) {
    try {
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout IndexedDB')), opts.timeoutMs ?? 4000))
      const a = await Promise.race([abrirIndexedDB(idb), timeout])
      if (await sonda(a)) return { almacen: a, espejo: lsOk ? lsAlm : null, degradado: false }
    } catch {
      /* cae a localStorage */
    }
  }
  if (lsOk && lsAlm) return { almacen: lsAlm, espejo: null, degradado: false }
  return { almacen: crearAlmacenMemoria(), espejo: null, degradado: true }
}

/** Pide al navegador que no expulse nuestros datos al faltar espacio. Nunca lanza. */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    const st = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!st?.persist) return false
    if (st.persisted && (await st.persisted())) return true
    return await st.persist()
  } catch {
    return false
  }
}
