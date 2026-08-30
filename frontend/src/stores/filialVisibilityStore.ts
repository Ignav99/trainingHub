import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilialVisibilityState {
  mostrarFilial: boolean
  setMostrarFilial: (value: boolean) => void
  toggleMostrarFilial: () => void
}

export const useFilialVisibilityStore = create<FilialVisibilityState>()(
  persist(
    (set) => ({
      mostrarFilial: false,
      setMostrarFilial: (value) => set({ mostrarFilial: value }),
      toggleMostrarFilial: () => set((s) => ({ mostrarFilial: !s.mostrarFilial })),
    }),
    { name: 'filial-visibility' }
  )
)
