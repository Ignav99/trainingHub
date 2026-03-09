import Link from 'next/link'
import { Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SessionCard, MATCH_DAY_COLORS } from './SessionCard'
import type { SessionCardSession } from './SessionCard'
import type { Partido } from '@/types'

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function dateToWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day === 0 ? 6 : day - 1 // Monday=0 ... Sunday=6
}

interface DayColumnProps {
  dateStr: string
  sessions: SessionCardSession[]
  partido: Partido | undefined
  isMatchDay: boolean
}

export function DayColumn({ dateStr, sessions, partido, isMatchDay }: DayColumnProps) {
  const weekday = dateToWeekday(dateStr)
  const isToday = dateStr === new Date().toISOString().split('T')[0]

  // Determine the dominant match_day for this day
  const dominantMD = isMatchDay ? 'MD' : sessions[0]?.match_day || null
  const mdColors = dominantMD ? MATCH_DAY_COLORS[dominantMD] : null

  return (
    <div
      className={`rounded-lg border min-h-[180px] flex flex-col overflow-hidden ${
        isToday ? 'ring-2 ring-primary/30' : ''
      } ${mdColors ? `border-t-4 ${mdColors.border}` : 'border-t-4 border-t-transparent'}`}
    >
      {/* Day header */}
      <div className={`px-2 py-1.5 border-b text-center ${mdColors ? mdColors.bg : 'bg-muted/30'}`}>
        <p className="text-[10px] font-semibold text-muted-foreground">{DAY_NAMES[weekday]}</p>
        <p className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
          {new Date(dateStr + 'T12:00:00').getDate()}
        </p>
        {dominantMD && (
          <Badge variant="outline" className={`text-[9px] px-1 py-0 mt-0.5 ${mdColors?.text || ''}`}>
            {dominantMD}
          </Badge>
        )}
      </div>

      {/* Day content */}
      <div className="flex-1 p-1.5 space-y-1.5">
        {/* Match card */}
        {isMatchDay && partido && (
          <Link
            href={`/partidos/${partido.id}`}
            className="block p-1.5 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-1">
              <Swords className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-800">PARTIDO</span>
            </div>
            <p className="text-xs font-medium truncate mt-0.5">
              {partido.localia === 'local' ? 'vs' : '@'} {partido.rival?.nombre || 'Rival'}
            </p>
            {partido.hora && <p className="text-[10px] text-amber-700">{partido.hora}h</p>}
          </Link>
        )}

        {/* Session cards */}
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}

        {/* Empty */}
        {!isMatchDay && sessions.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground/30">
            <span className="text-[10px]">-</span>
          </div>
        )}
      </div>
    </div>
  )
}
