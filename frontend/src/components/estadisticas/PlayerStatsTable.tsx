'use client'

import { Loader2, Users, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AsistenciaHistorico {
  jugador_id: string
  nombre: string
  apellidos: string
  dorsal: number | null
  posicion_principal: string
  total_sesiones: number
  presencias: number
  ausencias: number
  porcentaje: number
  motivos: Record<string, number>
  ultima_ausencia: string | null
}

const MOTIVO_LABELS: Record<string, string> = {
  lesion: 'Lesion',
  enfermedad: 'Enfermedad',
  sancion: 'Sancion',
  permiso: 'Permiso',
  seleccion: 'Seleccion',
  viaje: 'Viaje',
  otro: 'Otro',
}

interface PlayerStatsTableProps {
  asistenciaData: AsistenciaHistorico[]
  asistenciaMedia: number
  asistenciaLoading: boolean
  asistenciaLoaded: boolean
}

export function PlayerStatsTable({
  asistenciaData,
  asistenciaMedia,
  asistenciaLoading,
  asistenciaLoaded,
}: PlayerStatsTableProps) {
  return (
    <>
      {/* Media del equipo */}
      {asistenciaLoaded && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{asistenciaMedia}%</p>
                <p className="text-xs text-muted-foreground">Media de asistencia del equipo</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{asistenciaData.length} jugadores</p>
              <p>{asistenciaData.reduce((s, j) => s + j.total_sesiones, 0) > 0
                ? `${asistenciaData[0]?.total_sesiones || 0} sesiones registradas`
                : 'Sin datos'
              }</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de asistencia */}
      {asistenciaLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : asistenciaData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay datos de asistencia. Registra asistencia en las sesiones para ver estadísticas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Asistencia por jugador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 font-medium">Jugador</th>
                    <th className="pb-2 font-medium text-center w-16">Dorsal</th>
                    <th className="pb-2 font-medium w-20">Posicion</th>
                    <th className="pb-2 font-medium text-center w-20">Sesiones</th>
                    <th className="pb-2 font-medium text-center w-20">Presencias</th>
                    <th className="pb-2 font-medium text-center w-20">Ausencias</th>
                    <th className="pb-2 font-medium w-48">Asistencia</th>
                    <th className="pb-2 font-medium w-32">Motivos</th>
                  </tr>
                </thead>
                <tbody>
                  {asistenciaData.map((j) => {
                    const barColor = j.porcentaje >= 90
                      ? 'bg-emerald-500'
                      : j.porcentaje >= 75
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    const textColor = j.porcentaje >= 90
                      ? 'text-emerald-700'
                      : j.porcentaje >= 75
                        ? 'text-amber-700'
                        : 'text-red-700'

                    return (
                      <tr key={j.jugador_id} className="border-b last:border-0 row-hover">
                        <td className="py-2.5 font-medium">
                          {j.nombre} {j.apellidos}
                        </td>
                        <td className="py-2.5 text-center text-muted-foreground">
                          {j.dorsal || '-'}
                        </td>
                        <td className="py-2.5">
                          <Badge variant="outline" className="text-[10px]">{j.posicion_principal}</Badge>
                        </td>
                        <td className="py-2.5 text-center">{j.total_sesiones}</td>
                        <td className="py-2.5 text-center text-emerald-600 font-medium">{j.presencias}</td>
                        <td className="py-2.5 text-center text-red-600 font-medium">{j.ausencias}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor} transition-all`}
                                style={{ width: `${j.porcentaje}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${textColor}`}>
                              {j.porcentaje}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(j.motivos).map(([motivo, count]) => (
                              <span key={motivo} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {MOTIVO_LABELS[motivo] || motivo} ({count})
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
