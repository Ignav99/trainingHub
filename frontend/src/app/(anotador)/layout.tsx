'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { Toaster } from '@/components/ui/toast'

export default function AnotadorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuthStore()
  const loadEquipos = useEquipoStore((s) => s.loadEquipos)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) loadEquipos()
  }, [isAuthenticated, loadEquipos])

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-[100dvh] bg-[#0c1410]" />
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c1410] text-zinc-100 touch-manipulation select-none overflow-hidden">
      {children}
      <Toaster />
    </div>
  )
}
