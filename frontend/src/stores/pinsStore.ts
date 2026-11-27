import { create } from 'zustand'
import type { Ancla, Punto } from '@/lib/pins/ancla'

/** idle: marcadores · colocando: eligiendo el punto · viendo: burbujas resumidas de todos. */
export type ModoPines = 'idle' | 'colocando' | 'viendo'

export interface BorradorPin {
  ancla: Ancla
  /** Punto en la ventana donde se hizo clic (para colocar el compositor). */
  punto: Punto
}

interface PinsState {
  modo: ModoPines
  /** Los marcadores se pueden ocultar del todo. */
  ocultos: boolean
  abierto: string | null
  /** Al llegar por enlace: marcador con pulso breve. */
  resaltado: string | null
  borrador: BorradorPin | null
  /** Compositor de comentario sobre la página (junto al botón). */
  comentando: boolean
  comentar: (v?: boolean) => void
  colocar: () => void
  cancelar: () => void
  setBorrador: (b: BorradorPin | null) => void
  abrir: (id: string | null) => void
  resaltar: (id: string | null) => void
  alternarVerTodos: () => void
  alternarOcultos: () => void
}

export const usePinsStore = create<PinsState>()((set, get) => ({
  modo: 'idle',
  ocultos: false,
  abierto: null,
  resaltado: null,
  borrador: null,
  comentando: false,
  comentar: (v = true) => set({ comentando: v, abierto: v ? null : get().abierto, modo: 'idle', borrador: null }),
  colocar: () => set({ modo: 'colocando', borrador: null, abierto: null, ocultos: false, comentando: false }),
  cancelar: () => set({ modo: get().modo === 'viendo' ? 'viendo' : 'idle', borrador: null }),
  setBorrador: (borrador) => set({ borrador, modo: borrador ? 'idle' : get().modo }),
  abrir: (abierto) => set({ abierto, borrador: null, comentando: false }),
  resaltar: (resaltado) => set({ resaltado }),
  alternarVerTodos: () => set((s) => ({ modo: s.modo === 'viendo' ? 'idle' : 'viendo', ocultos: false })),
  alternarOcultos: () => set((s) => ({ ocultos: !s.ocultos, abierto: null })),
}))
