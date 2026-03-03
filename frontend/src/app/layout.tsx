import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { SWRProvider } from '@/components/providers/SWRProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TrainingHub Pro',
  description: 'Sistema profesional de gestión de entrenamientos de fútbol',
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
            </ThemeProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
