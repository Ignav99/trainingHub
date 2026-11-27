import { KabineMark } from '@/components/brand/KabineLogo'

/** Carga con la forma real de la pantalla: barra, campo con once fichas, banquillo y acciones. */
export function EsqueletoAnotador() {
  const bloque = 'animate-pulse rounded-lg bg-secondary'
  return (
    <div data-superficie="visitante" className="flex h-[100dvh] flex-col bg-background text-foreground" aria-busy aria-label="Cargando el partido">
      <div className="flex items-center gap-3 border-b-[1.5px] border-line px-3 py-2">
        <KabineMark variant="mono" className="h-9 w-9" />
        <div className={`${bloque} h-12 w-44`} />
        <div className="flex-1" />
        <div className={`${bloque} h-12 w-56`} />
        <div className="flex-1" />
        <div className={`${bloque} h-14 w-52`} />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 p-3 landscape:flex-row portrait:flex-col">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="relative flex-1 rounded-lg border-[1.5px] border-line bg-card">
            {Array.from({ length: 11 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-14 w-14 animate-pulse rounded-full bg-secondary"
                style={{ left: `${[12, 30, 28, 28, 30, 50, 48, 50, 82, 86, 82][i]}%`, top: `${[50, 12, 35, 65, 88, 25, 50, 75, 20, 50, 80][i]}%`, transform: 'translate(-50%,-50%)' }}
              />
            ))}
          </div>
          <div className={`${bloque} h-24`} />
        </div>
        <div className="grid shrink-0 content-start gap-2 landscape:w-[244px]">
          {[16, 16, 12, 14, 14, 14].map((h, i) => (
            <div key={i} className={`${bloque}`} style={{ height: h * 4 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
