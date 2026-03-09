import { CalendarDays } from 'lucide-react'
import { DayColumn } from './DayColumn'
import { MATCH_DAY_COLORS } from './SessionCard'
import type { SessionCardSession } from './SessionCard'
import type { Partido } from '@/types'

interface WeekViewProps {
  weekDates: string[]
  sessionsByDate: Record<string, SessionCardSession[]>
  partido: Partido | undefined
}

export function WeekView({ weekDates, sessionsByDate, partido }: WeekViewProps) {
  return (
    <div>
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <CalendarDays className="h-5 w-5" />
        Timeline Semanal
      </h2>
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((dateStr) => {
          const daySessions = sessionsByDate[dateStr] || []
          const isMatchDay = !!(partido && partido.fecha.slice(0, 10) === dateStr)

          return (
            <DayColumn
              key={dateStr}
              dateStr={dateStr}
              sessions={daySessions}
              partido={partido}
              isMatchDay={isMatchDay}
            />
          )
        })}
      </div>

      {/* MD Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(MATCH_DAY_COLORS).map(([md, colors]) => (
          <div key={md} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${colors.bg} ${colors.text}`}>
            <span className="font-bold">{md}</span>
            <span>{colors.label}</span>
            <span className="text-[9px] opacity-60">({colors.carga})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
