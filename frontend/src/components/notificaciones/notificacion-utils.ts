import { AtSign, Bell, CheckCircle2, CornerDownRight, HeartPulse, ListTodo, Megaphone, HelpCircle, Swords, Calendar, Activity } from 'lucide-react'
import type { Notificacion } from '@/types'

export function destinoNotificacion(n: Notificacion): string | null {
  if (n.url) return n.url
  if (!n.entidad_id) return null
  switch (n.entidad_tipo) {
    case 'sesion':
      return `/sesiones/${n.entidad_id}`
    case 'partido':
      return `/partidos/${n.entidad_id}`
    case 'jugador':
      return `/plantilla/${n.entidad_id}`
    case 'staff_post':
      return `/tablero?post=${n.entidad_id}`
    default:
      return null
  }
}

export const ICONO_TIPO: Record<string, { icon: typeof Bell; tono: string }> = {
  mencion: { icon: AtSign, tono: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  tarea_asignada: { icon: ListTodo, tono: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  respuesta: { icon: CornerDownRight, tono: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  aviso_staff: { icon: Megaphone, tono: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  pregunta_staff: { icon: HelpCircle, tono: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  tarea_resuelta: { icon: CheckCircle2, tono: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  pregunta_resuelta: { icon: CheckCircle2, tono: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  sesion_creada: { icon: Calendar, tono: 'bg-muted text-muted-foreground' },
  partido_resultado: { icon: Swords, tono: 'bg-muted text-muted-foreground' },
  jugador_lesion: { icon: HeartPulse, tono: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  rpe_alerta: { icon: Activity, tono: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
}

export function iconoNotificacion(tipo: string) {
  return ICONO_TIPO[tipo] ?? { icon: Bell, tono: 'bg-muted text-muted-foreground' }
}
