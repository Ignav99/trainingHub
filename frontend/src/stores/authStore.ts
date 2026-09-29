import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Subscription } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import { api } from '@/lib/api/client'
import {
  localSupabaseSessionPresent,
  readPersistedAuth,
  shouldClearSharedAuthOnSignedOut,
} from '@/lib/authSession'
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
// Set only while this tab calls logout(). A SIGNED_OUT broadcast from
// another tab must not wipe the shared localStorage session.
let explicitLogout = false

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (m.includes('email not confirmed')) {
    return 'Confirma tu email antes de iniciar sesión.'
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  }
  if (m.includes('user not found')) {
    return 'No hay ninguna cuenta con ese email.'
  }
  return 'No se pudo iniciar sesión. Comprueba tus datos o usa «¿Olvidaste tu contraseña?»'
}

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
        const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_OUT') {
              const sessionStillStored = typeof window !== 'undefined'
                && localSupabaseSessionPresent(window.localStorage)
              if (!shouldClearSharedAuthOnSignedOut(explicitLogout, sessionStillStored)) return
              set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
              })
            } else if (session?.access_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
              // Keep the shared login. User data stays from login/register or the persisted blob.
              set({ accessToken: session.access_token, isAuthenticated: true })
            }
          }
        )
        _authListenerUnsub = subscription.unsubscribe

        try {
          const { data: { session } } = await getSupabaseClient().auth.getSession()

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

          const persisted = typeof window !== 'undefined'
            ? readPersistedAuth(window.localStorage)
            : null
          if (persisted?.isAuthenticated && persisted.accessToken) {
            const current = get()
            set({
              user: current.user ?? (persisted.user as Usuario | null),
              accessToken: persisted.accessToken,
              isAuthenticated: true,
              isLoading: false,
            })
            return
          }

          set({ isLoading: false })
        } catch (error) {
          console.error('Error initializing auth:', error)
          const persisted = typeof window !== 'undefined'
            ? readPersistedAuth(window.localStorage)
            : null
          if (persisted?.isAuthenticated && persisted.accessToken) {
            const current = get()
            set({
              user: current.user ?? (persisted.user as Usuario | null),
              accessToken: persisted.accessToken,
              isAuthenticated: true,
              isLoading: false,
            })
            return
          }
          set({ isLoading: false })
        }
      },

      login: async (identifier: string, password: string) => {
        set({ isLoading: true })

        try {
          // `identifier` may be a plain username (superadmin/administrador_club/
          // coordinador_club, no real email) — resolve it to the internal
          // synthetic email Supabase Auth needs before signing in.
          let email = identifier
          if (!identifier.includes('@')) {
            try {
              const resolved = await api.post<{ email: string }>('/auth/resolve-username', {
                username: identifier,
              })
              email = resolved.email
            } catch {
              set({ isLoading: false })
              return { success: false, error: 'Credenciales inválidas' }
            }
          }

          // Use Supabase client for auth (manages session, token refresh, etc.)
          const { data, error } = await getSupabaseClient().auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ isLoading: false })
            return { success: false, error: mapAuthError(error.message) }
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
          } catch (meError: unknown) {
            await getSupabaseClient().auth.signOut()
            set({ isLoading: false })
            const detail =
              meError && typeof meError === 'object' && 'message' in meError
                ? String((meError as { message?: string }).message)
                : ''
            if (detail.includes('desactivado')) {
              return { success: false, error: 'Tu cuenta está desactivada. Contacta al administrador del club.' }
            }
            return {
              success: false,
              error: 'Tu sesión es válida pero falta el perfil en TrainingHub. Contacta soporte.',
            }
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
          await getSupabaseClient().auth.signInWithPassword({
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
        explicitLogout = true
        try {
          await getSupabaseClient().auth.signOut()
        } finally {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          })
          // Clear other persisted stores keyed to the previous account —
          // otherwise the next login in this browser (e.g. superadmin, or a
          // different club's admin) reuses the last selected club/team.
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('equipo-storage')
            window.localStorage.removeItem('traininghub-club')
          }
          explicitLogout = false
        }
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
