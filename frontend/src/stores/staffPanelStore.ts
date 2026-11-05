import { create } from 'zustand'

export type VistaPanelStaff = 'pendiente' | 'tablero' | 'actividad'

interface StaffPanelState {
  abierto: boolean
  vista: VistaPanelStaff
  postId: string | null
  abrir: (vista?: VistaPanelStaff) => void
  verHilo: (postId: string) => void
  cerrarHilo: () => void
  setVista: (vista: VistaPanelStaff) => void
  cerrar: () => void
}

export const useStaffPanel = create<StaffPanelState>()((set) => ({
  abierto: false,
  vista: 'pendiente',
  postId: null,
  abrir: (vista = 'pendiente') => set({ abierto: true, vista, postId: null }),
  verHilo: (postId) => set({ abierto: true, postId }),
  cerrarHilo: () => set({ postId: null }),
  setVista: (vista) => set({ vista, postId: null }),
  cerrar: () => set({ abierto: false, postId: null }),
}))

const HILO_RE = /^\/tablero\?(?:.*&)?post=([0-9a-f-]{36})/i

/** Los enlaces `/tablero?post=…` (notificaciones antiguas, actividad) abren el panel. */
export function hiloDeEnlace(href: string | null | undefined): string | null {
  if (!href) return null
  return HILO_RE.exec(href)?.[1] ?? null
}
