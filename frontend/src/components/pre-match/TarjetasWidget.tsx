'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ShieldAlert, Ban, Gavel, Info } from 'lucide-react'
import type { PreMatchTarjetas, PreMatchSancion } from '@/types'

function CicloVisual({ ciclo, max = 5 }: { ciclo: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2.5 rounded-sm ${
            i < ciclo ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

function MotivoIcon({ motivo }: { motivo?: string | null }) {
  if (!motivo) return null
  switch (motivo) {
    case 'roja':
      return <Ban className="h-2.5 w-2.5" />
    case 'doble_amarilla':
      return <ShieldAlert className="h-2.5 w-2.5" />
    case 'sancion_oficial':
      return <Gavel className="h-2.5 w-2.5" />
    default:
      return null
  }
}

export function TarjetasWidget({
  tarjetas,
  sanciones,
}: {
  tarjetas?: PreMatchTarjetas
  sanciones?: PreMatchSancion[]
}) {
  const jugadores = tarjetas?.jugadores || []
  const activos = sanciones?.filter(s => s.categoria === 'jugador') || []
  const jornadasSinDatos = tarjetas?.jornadas_sin_datos || []

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Tarjetas / Sanciones</h4>
          {tarjetas && (
            <Badge className="bg-slate-800 text-slate-400 text-[9px]">
              {tarjetas.actas_con_tarjetas ?? tarjetas.total_actas} de {tarjetas.total_actas} actas
            </Badge>
          )}
        </div>

        {/* Incomplete data warning */}
        {jornadasSinDatos.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/30 border border-amber-800/30">
            <Info className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-400">
              Sin datos en jornada{jornadasSinDatos.length > 1 ? 's' : ''}: {jornadasSinDatos.join(', ')}
            </span>
          </div>
        )}

        {jugadores.length > 0 && (
          <div className="space-y-1">
            {jugadores.slice(0, 10).map((j, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-1 px-2 rounded ${
                  j.estado === 'Sancionado'
                    ? 'bg-red-950/40 border border-red-800/20'
                    : j.estado === 'Apercibido'
                    ? 'bg-amber-950/30 border border-amber-800/20'
                    : 'bg-slate-800/50'
                }`}
              >
                <span className="text-xs text-white flex-1 truncate">{j.nombre}</span>

                {/* Cycle visual */}
                {(j.amarillas_ciclo !== undefined && j.amarillas_ciclo !== null) && (
                  <CicloVisual ciclo={j.amarillas_ciclo} />
                )}

                {/* Card counts */}
                <div className="flex items-center gap-1.5">
                  {j.amarillas > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-2.5 h-3.5 rounded-sm bg-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium">{j.amarillas}</span>
                    </div>
                  )}
                  {j.rojas > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-2.5 h-3.5 rounded-sm bg-red-500" />
                      <span className="text-[10px] text-red-400 font-medium">{j.rojas}</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                {j.estado === 'Sancionado' && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0 gap-0.5">
                    <MotivoIcon motivo={j.sancionado_motivo} />
                    Sancionado{j.sancionado_restantes && j.sancionado_restantes > 1
                      ? ` (${j.sancionado_restantes})`
                      : ''}
                  </Badge>
                )}
                {j.estado === 'Apercibido' && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Apercibido
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {activos.length > 0 && (
          <>
            <div className="border-t border-slate-700 pt-2">
              <span className="text-[10px] text-red-400 font-semibold uppercase">Sanciones Oficiales</span>
            </div>
            <div className="space-y-1">
              {activos.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-red-950/30">
                  <span className="text-xs text-white flex-1 truncate">{s.persona_nombre}</span>
                  <span className="text-[10px] text-red-400 truncate max-w-[120px]">{s.descripcion}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {jugadores.length === 0 && (!activos || activos.length === 0) && (
          <p className="text-xs text-slate-500 text-center py-2">Sin tarjetas registradas</p>
        )}
      </CardContent>
    </Card>
  )
}
