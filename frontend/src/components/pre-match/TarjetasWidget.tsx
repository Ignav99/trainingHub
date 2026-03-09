'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { PreMatchTarjetas, PreMatchSancion } from '@/types'

export function TarjetasWidget({
  tarjetas,
  sanciones,
}: {
  tarjetas?: PreMatchTarjetas
  sanciones?: PreMatchSancion[]
}) {
  const jugadores = tarjetas?.jugadores || []
  const activos = sanciones?.filter(s => s.categoria === 'jugador') || []

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Tarjetas / Sanciones</h4>
          {tarjetas && (
            <Badge className="bg-slate-800 text-slate-400 text-[9px]">
              {tarjetas.total_actas} actas
            </Badge>
          )}
        </div>

        {jugadores.length > 0 && (
          <div className="space-y-1">
            {jugadores.slice(0, 8).map((j, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1 px-2 rounded bg-slate-800/50"
              >
                <span className="text-xs text-white flex-1 truncate">{j.nombre}</span>
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
                {j.estado !== 'OK' && (
                  <Badge className={`text-[9px] px-1.5 py-0 ${
                    j.estado === 'Sancionado'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {j.estado}
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
