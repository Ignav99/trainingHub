import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'
import CookieConsent from '@/components/legal/CookieConsent'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <SWRProvider>
            <ThemeProvider>
              {children}
              <CookieConsent />
            </ThemeProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
