import type { Metadata, Viewport } from 'next'
import { Encode_Sans, IBM_Plex_Mono, Inter, Martian_Mono, Schibsted_Grotesk } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'
import CookieConsent from '@/components/legal/CookieConsent'
import { WritingAssistProvider } from '@/components/providers/WritingAssistProvider'
import { appearanceBootScript } from '@/lib/appearance'

const ui = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-ui', display: 'swap' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })
const classic = Inter({ subsets: ['latin'], variable: '--font-classic', display: 'swap' })
const cal = Encode_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-cal', display: 'swap', preload: false })
const calMono = Martian_Mono({ subsets: ['latin'], axes: ['wdth'], variable: '--font-cal-mono', display: 'swap', preload: false })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a3a6b',
}

export const metadata: Metadata = {
  title: 'Kabin-e',
  description: 'Plataforma profesional de gestión deportiva',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-icon.png',
    apple: '/icons/apple-touch-icon-180x180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kabin-e',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${ui.variable} ${mono.variable} ${classic.variable} ${cal.variable} ${calMono.variable}`}>
      <body>
        <Script id="kabine-appearance" strategy="beforeInteractive">{appearanceBootScript}</Script>
        <AuthProvider>
          <SWRProvider>
            <ThemeProvider>
              {children}
              <WritingAssistProvider />
              <CookieConsent />
            </ThemeProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
