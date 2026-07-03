'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Swords, ChevronRight, Shield, Crosshair, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InformeRivalEnriquecido, Partido } from '@/types'

interface WarRoomRivalResumenProps {
  rivalInfo: InformeRivalEnriquecido | null | undefined
  partido: Partido | null | undefined
}

export function WarRoomRivalResumen({ rivalInfo, partido }: WarRoomRivalResumenProps) {
  if (!partido) return null

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-600" />
            <span>Partido</span>
          </div>
          <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" asChild>
            <Link href={`/partidos/${partido.id}`}>
              Ficha <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Match header */}
        <div className="flex items-center gap-3">
          {partido.rival?.escudo_url ? (
            <Image
              src={partido.rival.escudo_url}
              alt={partido.rival?.nombre || 'Rival'}
              width={36}
              height={36}
              className="object-contain shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Swords className="h-5 w-5 text-amber-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">
              {partido.localia === 'local' ? 'vs' : '@'} {partido.rival?.nombre || 'Rival'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {new Date(partido.fecha).toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'short'
                })}
              </span>
              {partido.hora && <span>{partido.hora}h</span>}
            </div>
          </div>
        </div>

        {/* Enriched rival info */}
        {rivalInfo ? (
          <div className="space-y-2.5">
            {/* Sistema */}
            {rivalInfo.sistema_juego && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-medium">Sistema:</span>
                <Badge variant="outline" className="text-[10px]">{rivalInfo.sistema_juego}</Badge>
                {rivalInfo.sistema_variantes?.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    (+{rivalInfo.sistema_variantes.length} variantes)
                  </span>
                )}
              </div>
            )}

            {/* Fortalezas */}
            {rivalInfo.fortalezas?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 mb-1">
                  <Target className="h-3 w-3" /> Fortalezas
                </p>
                <ul className="space-y-0.5">
                  {rivalInfo.fortalezas.slice(0, 2).map((f, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <span className="text-amber-500 mt-1">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Debilidades */}
            {rivalInfo.debilidades?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-green-700 flex items-center gap-1 mb-1">
                  <Crosshair className="h-3 w-3" /> Debilidades
                </p>
                <ul className="space-y-0.5">
                  {rivalInfo.debilidades.slice(0, 2).map((d, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <span className="text-green-500 mt-1">•</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Jugadores clave */}
            {rivalInfo.jugadores_clave?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold mb-1">Jugadores clave</p>
                <div className="flex flex-wrap gap-1.5">
                  {rivalInfo.jugadores_clave.map((j, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className={`text-[10px] ${
                        j.tipo === 'peligroso' ? 'bg-red-50 text-red-700 border-red-200' :
                        j.tipo === 'debilidad' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Lesionados/sancionados */}
            {rivalInfo.lesionados_sancionados?.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                ⚠️ Bajas rival: {rivalInfo.lesionados_sancionados.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-2 text-center border rounded-lg border-dashed">
            Sin informe del rival
          </div>
        )}
      </CardContent>
    </Card>
  )
}
