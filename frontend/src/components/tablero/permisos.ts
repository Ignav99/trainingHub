import type { MiembroStaff, Usuario } from '@/types'

export function puedeModerarTablero(user: Pick<Usuario, 'id' | 'rol'> | null | undefined, miembros: MiembroStaff[]): boolean {
  if (!user) return false
  if (user.rol === 'admin' || user.rol === 'superadmin_plataforma') return true
  return miembros.some((m) => m.id === user.id && m.rol_en_equipo === 'entrenador_principal')
}
