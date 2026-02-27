'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Swords,
  Plus,
  Calendar,
  MapPin,
  Trophy,
  ChevronRight,
  Filter,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useEquipoStore } from '@/stores/equipoStore'
import { partidosApi } from '@/lib/api/partidos'
import { formatDate } from '@/lib/utils'
import type { Partido } from '@/types'

const RESULTADO_COLORS: Record<string, string> = {
  victoria: 'bg-emerald-100 text-emerald-800',
  empate: 'bg-amber-100 text-amber-800',
  derrota: 'bg-red-100 text-red-800',
}

const RESULTADO_LABELS: Record<string, string> = {
  victoria: 'Victoria',
  empate: 'Empate',
  derrota: 'Derrota',
}

const COMP_COLORS: Record<string, string> = {
  liga: 'bg-blue-100 text-blue-800',
  copa: 'bg-purple-100 text-purple-800',
  amistoso: 'bg-gray-100 text-gray-700',
  torneo: 'bg-orange-100 text-orange-800',
  otro: 'bg-gray-100 text-gray-700',
}

export default function PartidosPage() {
  const { equipoActivo } = useEquipoStore()
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'jugados'>('todos')
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'rfaf' | 'manual'>('todos')

  const fetchPartidos = async () => {
    if (!equipoActivo?.id) return
    setLoading(true)
    try {
      const params: Record<string, any> = {
        equipo_id: equipoActivo.id,
        orden: 'fecha',
        direccion: 'desc',
        limit: 50,
      }
      if (filter === 'pendientes') params.solo_pendientes = true
      if (filter === 'jugados') params.solo_jugados = true

      const res = await partidosApi.list(params)
      let data = res?.data || []
      // Client-side source filter
      if (sourceFilter === 'rfaf') data = data.filter(p => p.auto_creado)
      if (sourceFilter === 'manual') data = data.filter(p => !p.auto_creado)
      setPartidos(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartidos()
  }, [equipoActivo?.id, filter, sourceFilter])

  // Stats
  const jugados = partidos.filter((p) => p.resultado)
  const victorias = jugados.filter((p) => p.resultado === 'victoria').length
  const empates = jugados.filter((p) => p.resultado === 'empate').length
  const derrotas = jugados.filter((p) => p.resultado === 'derrota').length
  const golesF = jugados.reduce((s, p) => s + (p.goles_favor || 0), 0)
  const golesC = jugados.reduce((s, p) => s + (p.goles_contra || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            Partidos
          </h1>
          <p className="text-muted-foreground mt-1">Calendario de competicion y resultados</p>
        </div>
        <Button asChild>
          <Link href="/partidos/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Partido
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {jugados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{victorias}</p>
              <p className="text-xs text-muted-foreground">Victorias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{empates}</p>
              <p className="text-xs text-muted-foreground">Empates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{derrotas}</p>
              <p className="text-xs text-muted-foreground">Derrotas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{golesF}</p>
              <p className="text-xs text-muted-foreground">Goles a favor</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{golesC}</p>
              <p className="text-xs text-muted-foreground">Goles en contra</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['todos', 'pendientes', 'jugados'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'pendientes' ? 'Pendientes' : 'Jugados'}
          </Button>
        ))}
        <span className="text-muted-foreground/30 self-center">|</span>
        {(['todos', 'rfaf', 'manual'] as const).map((f) => (
          <Button
            key={f}
            variant={sourceFilter === f ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSourceFilter(f)}
          >
            {f === 'todos' ? 'Origen: Todos' : f === 'rfaf' ? 'Solo RFAF' : 'Solo manuales'}
          </Button>
        ))}
      </div>

      {/* Match list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : partidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Sin partidos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filter !== 'todos' ? 'No hay partidos con este filtro' : 'Crea el primer partido de la temporada'}
            </p>
            <Button asChild>
              <Link href="/partidos/nuevo">
                <Plus className="h-4 w-4 mr-2" /> Nuevo Partido
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              O <Link href="/competicion" className="text-primary hover:underline">
                importa tu competicion
              </Link> para generar partidos automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {partidos.map((partido) => (
            <Link
              key={partido.id}
              href={`/partidos/${partido.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Date */}
                      <div className="text-center shrink-0 w-14">
                        <p className="text-xs text-muted-foreground uppercase">
                          {new Date(partido.fecha).toLocaleDateString('es-ES', { weekday: 'short' })}
                        </p>
                        <p className="text-lg font-bold">
                          {new Date(partido.fecha).getDate()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(partido.fecha).toLocaleDateString('es-ES', { month: 'short' })}
                        </p>
                      </div>

                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {partido.localia === 'local' ? 'LOCAL' : partido.localia === 'visitante' ? 'VISIT' : 'NEUTRO'}
                          </span>
                          <Badge variant="outline" className={`text-[10px] ${COMP_COLORS[partido.competicion] || COMP_COLORS.otro}`}>
                            {partido.competicion}
                          </Badge>
                          {partido.jornada && (
                            <span className="text-[10px] text-muted-foreground">J{partido.jornada}</span>
                          )}
                          {partido.auto_creado && (
                            <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-700 bg-blue-50 px-1 py-0">
                              RFAF
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold truncate mt-0.5">
                          {partido.localia === 'local' ? 'vs' : '@'} {partido.rival?.nombre || 'Rival'}
                        </p>
                        <div className="flex items-center gap-2">
                          {partido.hora && (
                            <p className="text-xs text-muted-foreground">{partido.hora}h</p>
                          )}
                          {partido.ubicacion && (
                            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {partido.ubicacion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Result */}
                    <div className="flex items-center gap-3">
                      {partido.resultado ? (
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {partido.goles_favor} - {partido.goles_contra}
                          </p>
                          <Badge className={RESULTADO_COLORS[partido.resultado] || ''}>
                            {RESULTADO_LABELS[partido.resultado] || partido.resultado}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pendiente</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
