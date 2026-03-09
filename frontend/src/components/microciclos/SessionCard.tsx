import Link from 'next/link'
import type { MatchDay } from '@/types'

const MATCH_DAY_COLORS: Record<string, { border: string; bg: string; text: string; label: string; carga: string }> = {
  'MD+1': { border: 'border-t-green-500', bg: 'bg-green-50', text: 'text-green-700', label: 'Recuperacion', carga: 'Muy baja' },
  'MD+2': { border: 'border-t-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', label: 'Regeneracion', carga: 'Baja' },
  'MD-4': { border: 'border-t-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Fuerza', carga: 'ALTA' },
  'MD-3': { border: 'border-t-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Resistencia', carga: 'ALTA' },
  'MD-2': { border: 'border-t-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Velocidad', carga: 'MEDIA' },
  'MD-1': { border: 'border-t-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', label: 'Activacion', carga: 'BAJA' },
  'MD':   { border: 'border-t-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'PARTIDO', carga: 'Competicion' },
}

export { MATCH_DAY_COLORS }

export interface SessionCardSession {
  id: string
  titulo: string
  match_day: MatchDay
  duracion_total?: number
  num_tareas: number
}

interface SessionCardProps {
  session: SessionCardSession
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link
      href={`/sesiones/${session.id}`}
      className="block p-1.5 rounded border hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-1 mb-0.5">
        {session.match_day && (
          <span className={`text-[9px] font-bold px-1 rounded ${
            MATCH_DAY_COLORS[session.match_day]?.bg || 'bg-gray-100'
          } ${MATCH_DAY_COLORS[session.match_day]?.text || 'text-gray-700'}`}>
            {session.match_day}
          </span>
        )}
      </div>
      <p className="text-xs font-medium truncate">{session.titulo}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {session.duracion_total && (
          <span className="text-[10px] text-muted-foreground">{session.duracion_total}min</span>
        )}
        {session.num_tareas > 0 && (
          <span className="text-[10px] text-muted-foreground">{session.num_tareas} tareas</span>
        )}
      </div>
    </Link>
  )
}
