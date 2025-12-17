import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Equipo } from '@/types'
import { equiposApi } from '@/lib/api/equipos'

interface EquipoState {
  equipos: Equipo[]
  equipoActivo: Equipo | null
  isLoading: boolean
  error: string | null

  loadEquipos: () => Promise<void>
  setEquipoActivo: (equipo: Equipo | null) => void
  selectEquipoById: (id: string) => void
}

export const useEquipoStore = create<EquipoState>()(
  persist(
    (set, get) => ({
      equipos: [],
      equipoActivo: null,
      isLoading: false,
      error: null,

      loadEquipos: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await equiposApi.list()
          const equipos = response.data || []

          // Si no hay equipo activo y hay equipos disponibles, seleccionar el primero
          const { equipoActivo } = get()
          let nuevoEquipoActivo = equipoActivo

          if (!equipoActivo && equipos.length > 0) {
            nuevoEquipoActivo = equipos[0]
          } else if (equipoActivo) {
            // Verificar que el equipo activo sigue existiendo
            const existe = equipos.find(e => e.id === equipoActivo.id)
            if (!existe && equipos.length > 0) {
              nuevoEquipoActivo = equipos[0]
            } else if (!existe) {
              nuevoEquipoActivo = null
            }
          }

          set({
            equipos,
            equipoActivo: nuevoEquipoActivo,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Error al cargar equipos',
            isLoading: false
          })
        }
      },

      setEquipoActivo: (equipo) => set({ equipoActivo: equipo }),

      selectEquipoById: (id) => {
        const { equipos } = get()
        const equipo = equipos.find(e => e.id === id) || null
        set({ equipoActivo: equipo })
      },
    }),
    {
      name: 'equipo-storage',
      partialize: (state) => ({
        equipoActivo: state.equipoActivo
      }),
    }
  )
)
