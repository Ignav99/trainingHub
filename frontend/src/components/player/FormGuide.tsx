import { cn } from '@/lib/utils'

const RESULTADO_CONFIG = {
  V: { label: 'Victoria', className: 'bg-emerald-500' },
  E: { label: 'Empate', className: 'bg-gray-400' },
  D: { label: 'Derrota', className: 'bg-red-500' },
} as const

export function FormGuide({ racha }: { racha: ('V' | 'E' | 'D')[] }) {
  if (racha.length === 0) {
    return <span className="text-[11px] text-gray-400">Sin partidos</span>
  }

  return (
    <div className="flex items-center gap-1" title="Racha de los últimos partidos">
      {racha.map((r, i) => {
        const config = RESULTADO_CONFIG[r]
        return (
          <span
            key={i}
            className={cn('h-2 w-2 rounded-full', config.className)}
            title={config.label}
          />
        )
      })}
    </div>
  )
}
