import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Organizacion } from '@/types'

interface ClubTheme {
  colorPrimario: string
  colorSecundario: string
  logoUrl: string | null
}

interface ClubState {
  organizacion: Organizacion | null
  theme: ClubTheme
  isOnboardingComplete: boolean

  setOrganizacion: (org: Organizacion) => void
  updateTheme: (theme: Partial<ClubTheme>) => void
  setOnboardingComplete: (complete: boolean) => void
  reset: () => void
}

const DEFAULT_THEME: ClubTheme = {
  colorPrimario: '#1e3a5f',
  colorSecundario: '#f0f4f8',
  logoUrl: null,
}

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      organizacion: null,
      theme: DEFAULT_THEME,
      isOnboardingComplete: false,

      setOrganizacion: (org: Organizacion) => {
        set({
          organizacion: org,
          theme: {
            colorPrimario: org.color_primario || DEFAULT_THEME.colorPrimario,
            colorSecundario: org.color_secundario || DEFAULT_THEME.colorSecundario,
            logoUrl: org.logo_url || null,
          },
          isOnboardingComplete: !!(org.config?.onboarding_complete),
        })
      },

      updateTheme: (partial) =>
        set((state) => ({
          theme: { ...state.theme, ...partial },
        })),

      setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),

      reset: () =>
        set({
          organizacion: null,
          theme: DEFAULT_THEME,
          isOnboardingComplete: false,
        }),
    }),
    {
      name: 'traininghub-club',
      partialize: (state) => ({
        organizacion: state.organizacion,
        theme: state.theme,
        isOnboardingComplete: state.isOnboardingComplete,
      }),
    }
  )
)

// Utility: Convert hex color to HSL string for CSS variables
export function hexToHsl(hex: string): string {
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Utility: Determine if a color is light or dark
export function isLightColor(hex: string): boolean {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}
