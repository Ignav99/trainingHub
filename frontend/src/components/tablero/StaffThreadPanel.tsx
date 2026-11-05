'use client'

import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import type { EntidadStaffPost } from '@/types'
import { PostComposer } from './PostComposer'
import { StaffThreadList } from './StaffThreadList'
import { useMiembrosStaff } from './useTablero'
import { puedeModerarTablero } from './permisos'

const TITULOS: Record<EntidadStaffPost, string> = {
  sesion: 'esta sesión',
  partido: 'este partido',
  jugador: 'este jugador',
}

/** Hilos del staff sobre una sesión, partido o jugador concretos. */
export function StaffThreadPanel({ entidadTipo, entidadId }: { entidadTipo: EntidadStaffPost; entidadId: string }) {
  const user = useAuthStore((s) => s.user)
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  const miembros = useMiembrosStaff(equipoId)

  if (!equipoId || !user) return null
  const esStaff = miembros.some((m) => m.id === user.id) || user.rol === 'admin' || user.rol === 'superadmin_plataforma'
  if (!esStaff) return null
  const entidad = { tipo: entidadTipo, id: entidadId }

  return (
    <section aria-labelledby={`staff-${entidadId}`} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={`staff-${entidadId}`} className="flex items-center gap-2 text-base font-semibold">
          <MessagesSquare className="h-4 w-4 text-[hsl(var(--club-primary))]" />
          Comentarios del staff
        </h2>
        <Link href="/tablero" className="text-xs text-muted-foreground hover:text-foreground">
          Abrir tablero
        </Link>
      </div>
      <PostComposer equipoId={equipoId} miembros={miembros} meId={user.id} entidad={entidad} />
      <StaffThreadList
        equipoId={equipoId}
        entidad={entidad}
        miembros={miembros}
        meId={user.id}
        puedeModerar={puedeModerarTablero(user, miembros)}
        limite={10}
        vacio={{
          titulo: `Sin comentarios sobre ${TITULOS[entidadTipo]}`,
          texto: 'Lo que escribáis aquí también aparece en el tablero del staff, con un enlace a esta página.',
        }}
      />
    </section>
  )
}
