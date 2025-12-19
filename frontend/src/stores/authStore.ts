import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import { Usuario } from '@/types'

interface AuthState {
  user: Usuario | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  setUser: (user: Usuario | null) => void
  initializeAuth: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  nombre: string
  apellidos?: string
  organizacion_nombre?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      initializeAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: userData } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (userData) {
              let organizacion = null
              if (userData.organizacion_id) {
                const { data: orgData } = await supabase
                  .from('organizaciones')
                  .select('*')
                  .eq('id', userData.organizacion_id)
                  .single()
                organizacion = orgData
              }

              set({
                user: { ...userData, organizacion },
                accessToken: session.access_token,
                isAuthenticated: true,
                isLoading: false,
              })
              return
            }
          }

          set({ isLoading: false })
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ isLoading: false })
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
            })
          } else if (session?.access_token && event === 'TOKEN_REFRESHED') {
            set({ accessToken: session.access_token })
          }
        })
      },

      login: async (email: string, password: string) => {
    set({ isLoading: true })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        set({ isLoading: false })
        return { success: false, error: error.message }
      }

      if (!data.user || !data.session) {
        set({ isLoading: false })
        return { success: false, error: 'Error al iniciar sesión' }
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (userError || !userData) {
        await supabase.auth.signOut()
        set({ isLoading: false })
        return { success: false, error: 'Usuario no encontrado en el sistema' }
      }

      let organizacion = null
      if (userData.organizacion_id) {
        const { data: orgData } = await supabase
          .from('organizaciones')
          .select('*')
          .eq('id', userData.organizacion_id)
          .single()
        organizacion = orgData
      }

      const user: Usuario = {
        ...userData,
        organizacion,
      }

      set({
        user,
        accessToken: data.session.access_token,
        isAuthenticated: true,
        isLoading: false,
      })

      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      return { success: false, error: 'Error de conexión' }
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true })

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        set({ isLoading: false })
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        set({ isLoading: false })
        return { success: false, error: 'Error al crear usuario' }
      }

      let organizacion = null
      let organizacionId: string | null = null
      if (data.organizacion_nombre) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizaciones')
          .insert({ nombre: data.organizacion_nombre })
          .select()
          .single()

        if (orgError) {
          set({ isLoading: false })
          return { success: false, error: 'Error al crear organización' }
        }
        organizacion = orgData
        organizacionId = orgData.id
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: data.email,
          nombre: data.nombre,
          apellidos: data.apellidos || null,
          rol: organizacionId ? 'admin' : 'tecnico_asistente',
          organizacion_id: organizacionId,
        })
        .select('*')
        .single()

      if (userError) {
        set({ isLoading: false })
        return { success: false, error: 'Error al crear perfil de usuario' }
      }

      const user: Usuario = {
        ...userData,
        organizacion,
      }

      set({
        user,
        accessToken: authData.session?.access_token || null,
        isAuthenticated: !!authData.session,
        isLoading: false,
      })

      return { success: true }
    } catch (error) {
      set({ isLoading: false })
      return { success: false, error: 'Error de conexión' }
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'traininghub-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
