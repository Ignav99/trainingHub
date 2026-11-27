'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { usePersistHydrated } from '@/hooks/usePersistHydrated'
import { KabineMark } from '@/components/brand/KabineLogo'
import { SesionCaducada } from '@/components/anotador/SesionCaducada'
import { hayDatosLocalesAnotador, marcarAnotadorActivo, registerServiceWorker } from '@/lib/register-sw'

/** Superficie Visitante de Cal: oscura, de alto contraste, para usar al sol en el campo. */
export default function AnotadorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuthStore()
  const loadEquipos = useEquipoStore((s) => s.loadEquipos)
  const authHydrated = usePersistHydrated(useAuthStore.persist)
  const equipoHydrated = usePersistHydrated(useEquipoStore.persist)

  // Sin conexión no hay forma de iniciar sesión, y una sesión caducada no puede dejar al delegado sin su partido:
  // si la tablet guarda datos del anotador, la app se queda abierta (sin sesión) y avisa para volver a entrar.
  const sesionActiva = authHydrated && !isLoading && isAuthenticated
  const [huboSesion, setHuboSesion] = useState(false)
  const [datosLocales, setDatosLocales] = useState<boolean | null>(null)

  useEffect(() => {
    if (sesionActiva) setHuboSesion(true)
  }, [sesionActiva])

  useEffect(() => {
    if (!authHydrated || isLoading || isAuthenticated) return
    let vivo = true
    void hayDatosLocalesAnotador().then((v) => { if (vivo) setDatosLocales(v) })
    return () => { vivo = false }
  }, [authHydrated, isLoading, isAuthenticated])

  const conservar = huboSesion || datosLocales === true

  useEffect(() => {
    if (!authHydrated || isLoading || isAuthenticated || huboSesion) return
    if (datosLocales === false) router.replace('/login')
  }, [authHydrated, isLoading, isAuthenticated, huboSesion, datosLocales, router])

  // Modo sin conexión: el service worker sirve el anotador y la capa de datos guarda en la tablet.
  useEffect(() => {
    registerServiceWorker()
    marcarAnotadorActivo(true)
    return () => marcarAnotadorActivo(false)
  }, [])

  useEffect(() => {
    if (!equipoHydrated || !isAuthenticated) return
    loadEquipos()
  }, [equipoHydrated, isAuthenticated, loadEquipos])

  if (!sesionActiva && !conservar) {
    return (
      <div data-superficie="visitante" className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
        <KabineMark variant="mono" className="h-12 w-12 opacity-60" />
      </div>
    )
  }

  return (
    <div
      data-superficie="visitante"
      className="min-h-[100dvh] touch-manipulation select-none overflow-hidden bg-background text-foreground"
    >
      {children}
      <SesionCaducada activa={!isAuthenticated} />
      <Toaster
        position="top-center"
        offset={88}
        duration={6000}
        toastOptions={{
          classNames: {
            toast: '!rounded-lg !border-[1.5px] !border-line !bg-card !text-foreground !shadow-none !text-base !font-semibold !min-h-14',
            actionButton: '!min-h-12 !rounded-lg !bg-primary !px-4 !text-base !font-bold !text-primary-foreground',
            description: '!text-foreground/70',
          },
        }}
      />
    </div>
  )
}
