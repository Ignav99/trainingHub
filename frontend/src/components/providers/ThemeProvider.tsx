'use client'

import { useEffect } from 'react'
import { useClubStore, hexToHsl, isLightColor } from '@/stores/clubStore'

/**
 * ThemeProvider injects club colors as CSS custom properties.
 * These are used by the `club` variant in Button, Badge, and other components.
 *
 * CSS Variables injected:
 * --club-primary: HSL of the primary club color
 * --club-primary-foreground: white or dark text depending on primary brightness
 * --club-secondary: HSL of the secondary club color
 * --club-secondary-foreground: white or dark text depending on secondary brightness
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useClubStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    if (theme.colorPrimario) {
      const primaryHsl = hexToHsl(theme.colorPrimario)
      const primaryFg = isLightColor(theme.colorPrimario) ? '222.2 84% 4.9%' : '0 0% 100%'
      root.style.setProperty('--club-primary', primaryHsl)
      root.style.setProperty('--club-primary-foreground', primaryFg)
      // Override base theme so all shadcn components (Button, Badge, links) use club color
      root.style.setProperty('--primary', primaryHsl)
      root.style.setProperty('--primary-foreground', primaryFg)
      root.style.setProperty('--ring', primaryHsl)
    }

    if (theme.colorSecundario) {
      root.style.setProperty('--club-secondary', hexToHsl(theme.colorSecundario))
      root.style.setProperty(
        '--club-secondary-foreground',
        isLightColor(theme.colorSecundario) ? '222.2 84% 4.9%' : '0 0% 100%'
      )
    }
  }, [theme.colorPrimario, theme.colorSecundario])

  return <>{children}</>
}
