'use client'

import { IconoBalon, IconoCambio, IconoTarjeta } from './Iconos'
import { Rotulo } from './Piezas'
import type { ResumenPartido } from './resumen'

interface Props {
  resumen: ResumenPartido
  club: string
  rival: string
}

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-[1.5px] border-border bg-background p-3">
      <Rotulo>{titulo}</Rotulo>
      <div className="mt-2 space-y-1.5 text-[16px]">{children}</div>
    </section>
  )
}

const vacio = <p className="text-[15px] text-muted-foreground">Ninguno</p>

/** Resumen del partido: resultado, goleadores, tarjetas, cambios y minutos. */
export function ResumenCierre({ resumen: r, club, rival }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4 rounded-lg border-[1.5px] border-line bg-background px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-right text-lg font-bold">{club}</span>
        <span className="text-5xl font-extrabold tabular-nums" style={{ fontStretch: '90%' }}>
          {r.gf}<span className="mx-2 text-muted-foreground">–</span>{r.gc}
        </span>
        <span className="min-w-0 flex-1 truncate text-lg font-bold">{rival}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Caja titulo="Goles">
          {r.goleadores.length === 0 && r.golesRivalMinutos.length === 0 && vacio}
          {r.goleadores.map((g) => (
            <p key={g.convId} className="flex items-center gap-2">
              <IconoBalon size={20} />
              <span className="font-semibold">{g.nombre}</span>
              <span className="tabular-nums text-muted-foreground">{g.minutos.map((m) => `${m}′`).join(' ')}</span>
            </p>
          ))}
          {r.golesRivalMinutos.length > 0 && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconoBalon size={20} />
              Rival <span className="tabular-nums">{r.golesRivalMinutos.map((m) => `${m}′`).join(' ')}</span>
            </p>
          )}
        </Caja>

        <Caja titulo="Tarjetas">
          {r.amarillas.length === 0 && r.rojas.length === 0 && vacio}
          {r.amarillas.map((t, i) => (
            <p key={`a${i}`} className="flex items-center gap-2">
              <IconoTarjeta tipo="amarilla" size={20} />
              <span className="font-semibold">{t.nombre}</span>
              <span className="tabular-nums text-muted-foreground">{t.minute}′</span>
            </p>
          ))}
          {r.rojas.map((t, i) => (
            <p key={`r${i}`} className="flex items-center gap-2">
              <IconoTarjeta tipo="roja" size={20} />
              <span className="font-semibold">{t.nombre}</span>
              <span className="tabular-nums text-muted-foreground">{t.minute}′</span>
            </p>
          ))}
        </Caja>

        <Caja titulo={`Cambios · ${r.cambios.length}`}>
          {r.cambios.length === 0 && vacio}
          {r.cambios.map((c, i) => (
            <p key={i} className="flex items-center gap-2">
              <IconoCambio size={20} />
              <span className="tabular-nums text-muted-foreground">{c.minute}′</span>
              <span className="min-w-0 truncate"><span className="font-semibold">{c.sale}</span> por <span className="font-semibold">{c.entra}</span></span>
            </p>
          ))}
        </Caja>

        <Caja titulo="Minutos jugados">
          {r.porMinutos.length === 0 && vacio}
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            {r.porMinutos.map((f) => (
              <div key={f.convId} className="contents">
                <span className="truncate"><span className="tabular-nums text-muted-foreground">{f.dorsal ?? '–'}</span> {f.nombre}</span>
                <span className="text-right font-semibold tabular-nums">{f.minutos}′</span>
              </div>
            ))}
          </div>
        </Caja>
      </div>
    </div>
  )
}
