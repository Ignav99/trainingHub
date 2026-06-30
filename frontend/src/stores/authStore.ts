import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Subscription } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { api } from '@/lib/api/client'
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

// Module-level reference for cleanup between hot-reloads in dev
let _authListenerUnsub: Subscription['unsubscribe'] | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      initializeAuth: async () => {
        // Prevent double-registration on hot reloads / multiple calls
        if (_authListenerUnsub) {
          _authListenerUnsub()
          _authListenerUnsub = null
        }

        // Register auth listener FIRST so we never miss a token refresh.
        // Store the unsubscribe function to prevent listener leaks.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_OUT') {
              set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
              })
            } else if (session?.access_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
              // Only update token — user data is set by login/register flows
              set({ accessToken: session.access_token })
            }
          }
        )
        _authListenerUnsub = subscription.unsubscribe

        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            // Use backend API (service-role) instead of direct Supabase query
            // to avoid RLS infinite recursion on usuarios table
            try {
              const userData = await api.get<Usuario>('/auth/me')
              set({
                user: userData,
                accessToken: session.access_token,
                isAuthenticated: true,
                isLoading: false,
              })
              return
            } catch {
              // Token might be expired or user not found — fall through
            }
          }

          set({ isLoading: false })
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true })

        try {
          // Use Supabase client for auth (manages session, token refresh, etc.)
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

          // Use backend API (service-role) to fetch user data
          // instead of direct Supabase query (avoids RLS recursion)
          // Note: onAuthStateChange listener already set accessToken via SIGNED_IN event
          try {
            const userData = await api.get<Usuario>('/auth/me')

            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            })

            return { success: true }
          } catch {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'Usuario no encontrado en el sistema' }
          }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: 'Error de conexión' }
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })

        try {
          // Use backend API for registration — handles org creation,
          // team setup, subscriptions, GDPR, etc.
          const userData = await api.post<Usuario>('/auth/register', {
            email: data.email,
            password: data.password,
            nombre: data.nombre,
            apellidos: data.apellidos || null,
            organizacion_nombre: data.organizacion_nombre || null,
            gdpr_consentimiento: true,
          })

          // Sign in via Supabase to get session tokens.
          // The onAuthStateChange listener automatically captures the accessToken
          // via SIGNED_IN event — we only need to set user + isAuthenticated here.
          await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          })

          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          })

          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          return { success: false, error: error.message || 'Error de conexión' }
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
