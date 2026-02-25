'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  ChevronLeft,
  MapPin,
  Building,
  Trophy,
  Swords,
  FileText,
  Loader2,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { rfefApi, RFEFCompeticion, RivalPerfilCompeticion } from '@/lib/api/rfef'
import { rivalesApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import type { Rival } from '@/types'

function Ultimos5({ resultados }: { resultados?: ('V' | 'E' | 'D')[] }) {
  if (!resultados?.length) return null
  return (
    <div className="flex gap-0.5">
      {resultados.map((r, i) => (
        <span
          key={i}
          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
            r === 'V' ? 'bg-emerald-500' : r === 'E' ? 'bg-amber-400' : 'bg-red-500'
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

const RESULTADO_COLORS: Record<string, string> = {
  victoria: 'text-emerald-600',
  empate: 'text-amber-600',
  derrota: 'text-red-600',
}

export default function RivalDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { equipoActivo } = useEquipoStore()

  const [rival, setRival] = useState<Rival | null>(null)
  const [perfil, setPerfil] = useState<RivalPerfilCompeticion | null>(null)
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id, equipoActivo?.id])

  async function loadData() {
    setLoading(true)
    try {
      // Load rival basic info
      const rivalData = await rivalesApi.get(id)
      setRival(rivalData)
      setNotas(rivalData.notas || '')

      // Load competition profile
      if (equipoActivo?.id) {
        try {
          const rfefRes = await rfefApi.listCompeticiones({ equipo_id: equipoActivo.id })
          const comp = (rfefRes.data || []).find((c: RFEFCompeticion) => c.mi_equipo_nombre)
          if (comp) {
            const perfilData = await rfefApi.getRivalPerfil(id, comp.id)
            setPerfil(perfilData)
          } else {
            // Still try without competition
            const perfilData = await rfefApi.getRivalPerfil(id)
            setPerfil(perfilData)
          }
        } catch {
          // Competition data is optional
          try {
            const perfilData = await rfefApi.getRivalPerfil(id)
            setPerfil(perfilData)
          } catch { /* ok */ }
        }
      }
    } catch (err) {
      console.error('Error loading rival:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveNotas() {
    if (!rival) return
    setSavingNotas(true)
    try {
      await rivalesApi.update(id, { notas })
      setRival({ ...rival, notas })
    } catch (err) {
      console.error('Error saving notas:', err)
    } finally {
      setSavingNotas(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (!rival) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rival no encontrado</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/rivales">Volver</Link>
        </Button>
      </div>
    )
  }

  const stats = perfil?.competition_stats
  const h2h = perfil?.head_to_head || []
  const last5 = perfil?.last_5_results || []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link href="/rivales" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Rivales
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
          {rival.escudo_url ? (
            <img src={rival.escudo_url} alt="" className="w-12 h-12 object-contain" />
          ) : (
            <Shield className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{rival.nombre}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            {rival.ciudad && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {rival.ciudad}
              </span>
            )}
            {rival.estadio && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {rival.estadio}
              </span>
            )}
            {rival.sistema_juego && (
              <Badge variant="outline">{rival.sistema_juego}</Badge>
            )}
            {rival.estilo && (
              <Badge variant="secondary">{rival.estilo}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Competition stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Estadisticas en la liga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.posicion}&#186;</p>
                <p className="text-xs text-muted-foreground">Posicion</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.puntos}</p>
                <p className="text-xs text-muted-foreground">Puntos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.gf}</p>
                <p className="text-xs text-muted-foreground">GF ({stats.gc} GC)</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{stats.pg}V {stats.pe}E {stats.pp}D</p>
                <p className="text-xs text-muted-foreground">{stats.pj} jugados</p>
              </div>
            </div>
            {stats.ultimos_5 && stats.ultimos_5.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Racha:</span>
                <Ultimos5 resultados={stats.ultimos_5} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last 5 results */}
      {last5.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Ultimos resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {last5.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground w-6">J{r.jornada}</span>
                  <span className="flex-1 text-right text-sm">{r.local}</span>
                  <Badge variant="outline" className="font-bold min-w-[50px] justify-center">
                    {r.goles_local} - {r.goles_visitante}
                  </Badge>
                  <span className="flex-1 text-sm">{r.visitante}</span>
                  {r.fecha && (
                    <span className="text-[10px] text-muted-foreground">{r.fecha}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Head to head */}
      {h2h.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" />
              Historial contra {rival.nombre_corto || rival.nombre}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {h2h.map((p) => (
                <Link
                  key={p.id}
                  href={`/partidos/${p.id}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.localia === 'local' ? 'LOCAL' : 'VISIT'}
                  </Badge>
                  {p.goles_favor !== null ? (
                    <span className={`font-bold ${RESULTADO_COLORS[p.resultado || ''] || ''}`}>
                      {p.goles_favor} - {p.goles_contra}
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pendiente</Badge>
                  )}
                  {p.jornada && (
                    <span className="text-xs text-muted-foreground">J{p.jornada}</span>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notas del entrenador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notas del entrenador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Estilo de juego, puntos fuertes, debilidades, jugadores clave..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          {notas !== (rival.notas || '') && (
            <Button
              size="sm"
              className="mt-2"
              onClick={handleSaveNotas}
              disabled={savingNotas}
            >
              {savingNotas && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Guardar notas
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
