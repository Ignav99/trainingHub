'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ChevronLeft,
  Save,
  Loader2,
  Shield,
  Swords,
  Target,
  Users,
  ArrowRightLeft,
  Flag,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { useEquipoStore } from '@/stores/equipoStore'
import { partidosApi } from '@/lib/api/partidos'
import { POSICIONES } from '@/lib/api/jugadores'
import { FORMATIONS } from '@/lib/formations'
import { formatDate } from '@/lib/utils'
import type { Partido, Convocatoria } from '@/types'

// Legacy position coords (fallback when no formation saved)
const POSITION_COORDS: Record<string, { top: string; left: string }> = {
  POR: { top: '88%', left: '50%' },
  DFC: { top: '72%', left: '40%' },
  DFC2: { top: '72%', left: '60%' },
  LTD: { top: '68%', left: '82%' },
  LTI: { top: '68%', left: '18%' },
  CAD: { top: '68%', left: '82%' },
  CAI: { top: '68%', left: '18%' },
  MCD: { top: '52%', left: '50%' },
  MC: { top: '48%', left: '38%' },
  MCO: { top: '40%', left: '50%' },
  MID: { top: '42%', left: '78%' },
  MII: { top: '42%', left: '22%' },
  EXD: { top: '22%', left: '78%' },
  EXI: { top: '22%', left: '22%' },
  MP: { top: '25%', left: '50%' },
  DC: { top: '18%', left: '50%' },
  SD: { top: '30%', left: '50%' },
}

// Position zone color helper
function getPositionColor(pos: string): string {
  const info = POSICIONES[pos as keyof typeof POSICIONES]
  if (!info) return 'bg-gray-100 text-gray-800'
  switch (info.zona) {
    case 'porteria': return 'bg-amber-100 text-amber-800'
    case 'defensa': return 'bg-blue-100 text-blue-800'
    case 'mediocampo': return 'bg-emerald-100 text-emerald-800'
    case 'ataque': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

interface PlanData {
  enfoque_tactico: string
  plan_ataque: string
  plan_defensa: string
  balon_parado: string
  plan_sustituciones: string
}

const EMPTY_PLAN: PlanData = {
  enfoque_tactico: '',
  plan_ataque: '',
  plan_defensa: '',
  balon_parado: '',
  plan_sustituciones: '',
}

const PLAN_SECTIONS = [
  {
    key: 'enfoque_tactico' as keyof PlanData,
    title: 'Enfoque Táctico',
    icon: Target,
    placeholder: 'Describe el enfoque general del partido: formación, ritmo de juego, presión...',
    color: 'text-primary',
  },
  {
    key: 'plan_ataque' as keyof PlanData,
    title: 'Plan de Ataque',
    icon: Swords,
    placeholder: 'Estrategia ofensiva: salida de balón, zonas a explotar, movimientos clave...',
    color: 'text-emerald-600',
  },
  {
    key: 'plan_defensa' as keyof PlanData,
    title: 'Plan Defensivo',
    icon: Shield,
    placeholder: 'Organización defensiva: tipo de pressing, línea defensiva, coberturas...',
    color: 'text-blue-600',
  },
  {
    key: 'balon_parado' as keyof PlanData,
    title: 'Balón Parado',
    icon: Flag,
    placeholder: 'Córners, faltas, saques de banda: encargados, movimientos ensayados...',
    color: 'text-amber-600',
  },
  {
    key: 'plan_sustituciones' as keyof PlanData,
    title: 'Plan de Sustituciones',
    icon: ArrowRightLeft,
    placeholder: 'Cambios planificados: minutos estimados, perfiles de recambio, escenarios...',
    color: 'text-violet-600',
  },
]

export default function MatchPlanPage() {
  const params = useParams()
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const id = params.id as string

  const { data: partido, isLoading: loadingPartido } = useSWR<Partido>(
    id ? `/partidos/${id}` : null
  )
  const { data: convoData, isLoading: loadingConvo } = useSWR<{ data: Convocatoria[]; total: number }>(
    id ? `/convocatorias/partido/${id}` : null
  )

  const convocatoria = convoData?.data || []
  const loading = loadingPartido || loadingConvo

  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<PlanData>(EMPTY_PLAN)
  const [hasChanges, setHasChanges] = useState(false)
  const [planInitialized, setPlanInitialized] = useState(false)

  // Formation data from notas_pre
  const [savedFormation, setSavedFormation] = useState<string | null>(null)
  const [savedSlots, setSavedSlots] = useState<Record<string, string>>({})
  const [extraData, setExtraData] = useState<Record<string, any>>({})

  // Parse plan from notas_pre when partido data loads
  useEffect(() => {
    if (!partido || planInitialized) return
    if (partido.notas_pre) {
      try {
        const parsed = JSON.parse(partido.notas_pre)
        if (parsed.enfoque_tactico !== undefined || parsed.formacion) {
          setPlan({
            enfoque_tactico: parsed.enfoque_tactico || '',
            plan_ataque: parsed.plan_ataque || '',
            plan_defensa: parsed.plan_defensa || '',
            balon_parado: parsed.balon_parado || '',
            plan_sustituciones: parsed.plan_sustituciones || '',
          })
          if (parsed.formacion) {
            setSavedFormation(parsed.formacion)
            setSavedSlots(parsed.formacion_slots || {})
          }
          // Store any extra keys for merge on save
          const { enfoque_tactico, plan_ataque, plan_defensa, balon_parado, plan_sustituciones, formacion, formacion_slots, ...rest } = parsed
          setExtraData(rest)
        }
      } catch {
        // Not JSON - use as enfoque_tactico
        setPlan({ ...EMPTY_PLAN, enfoque_tactico: partido.notas_pre })
      }
    }
    setPlanInitialized(true)
  }, [partido, planInitialized])

  const handlePlanChange = (key: keyof PlanData, value: string) => {
    setPlan((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!partido) return
    setSaving(true)
    try {
      // Merge plan data with formation data (preserve formation/slots)
      const merged: Record<string, any> = {
        ...extraData,
        ...plan,
      }
      if (savedFormation) {
        merged.formacion = savedFormation
        merged.formacion_slots = savedSlots
      }
      await partidosApi.update(id, { notas_pre: JSON.stringify(merged) })
      mutate((key: string) => typeof key === 'string' && key.includes('/partidos'), undefined, { revalidate: true })
      setHasChanges(false)
    } catch (err) {
      console.error('Error saving plan:', err)
    } finally {
      setSaving(false)
    }
  }

  // Normalize convocatoria player data (backend returns as "jugadores" from join)
  const getPlayerData = (conv: Convocatoria) => {
    return conv.jugador || conv.jugadores || null
  }

  const titulares = convocatoria.filter((c) => c.titular)
  const suplentes = convocatoria.filter((c) => !c.titular)

  // Resolve formation for display
  const activeFormation = savedFormation ? FORMATIONS.find((f) => f.name === savedFormation) : null

  if (loading) {
    return <DetailPageSkeleton />
  }

  if (!partido) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Partido no encontrado</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/partidos">Volver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/partidos/${id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Volver al partido
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Plan de Partido
            {savedFormation && (
              <Badge className="bg-primary/10 text-primary text-xs">{savedFormation}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {equipoActivo?.nombre} vs {partido.rival?.nombre} - {formatDate(partido.fecha)}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar plan
        </Button>
      </div>

      {/* Match summary bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline">{partido.competicion}</Badge>
              {partido.jornada && <span className="text-sm text-muted-foreground">J{partido.jornada}</span>}
              <Badge className={partido.localia === 'local' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                {partido.localia === 'local' ? 'Local' : 'Visitante'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {partido.rival?.estadio && <span>{partido.rival.estadio}</span>}
              {partido.hora && <span>{partido.hora}h</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rival info */}
      {partido.rival?.notas && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">Notas del rival: {partido.rival.nombre}</p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{partido.rival.notas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formation pitch + convocatoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pitch */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Once titular ({titulares.length} jugadores)
              {savedFormation && (
                <Badge variant="outline" className="text-[10px]">{savedFormation}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {titulares.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay convocatoria creada aún
                </p>
                <Link
                  href="/convocatorias"
                  className="text-sm text-primary hover:underline mt-1 inline-block"
                >
                  Crear convocatoria
                </Link>
              </div>
            ) : activeFormation ? (
              /* Formation-based pitch */
              <div className="relative bg-emerald-600/90 rounded-xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                {/* Pitch lines */}
                <div className="absolute inset-4">
                  <div className="absolute inset-0 border-2 border-white/30 rounded" />
                  <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-t-0 border-white/30" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-b-0 border-white/30" />
                </div>

                {/* Formation slots */}
                {activeFormation.slots.map((slot) => {
                  const convId = savedSlots[slot.id]
                  const conv = convId ? convocatoria.find((c) => c.id === convId) : null
                  const player = conv ? getPlayerData(conv) : null
                  const posInfo = POSICIONES[slot.position as keyof typeof POSICIONES]
                  const bgColor = posInfo?.color || '#9CA3AF'

                  if (conv) {
                    const displayName = player?.apodo || player?.apellidos || player?.nombre || `#${conv.dorsal || '?'}`
                    return (
                      <div
                        key={slot.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{ top: slot.top, left: slot.left }}
                      >
                        <div
                          className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center shadow-md text-white"
                          style={{ backgroundColor: bgColor }}
                        >
                          {conv.dorsal || player?.dorsal || '?'}
                        </div>
                        <span className="block text-[10px] text-white font-medium mt-0.5 max-w-[70px] truncate drop-shadow">
                          {displayName}
                        </span>
                      </div>
                    )
                  } else {
                    // Empty slot
                    return (
                      <div
                        key={slot.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{ top: slot.top, left: slot.left }}
                      >
                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                          <span className="text-[10px] text-white/40">{slot.label}</span>
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            ) : (
              /* Legacy pitch (no formation) */
              <div className="relative bg-emerald-600/90 rounded-xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <div className="absolute inset-4">
                  <div className="absolute inset-0 border-2 border-white/30 rounded" />
                  <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/30 rounded-full" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-t-0 border-white/30" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-b-0 border-white/30" />
                </div>

                {titulares.map((conv) => {
                  const player = getPlayerData(conv)
                  const pos = conv.posicion_asignada || player?.posicion_principal || 'MC'
                  const coords = POSITION_COORDS[pos] || { top: '50%', left: '50%' }
                  const displayName = player?.apodo || player?.apellidos || player?.nombre || `#${conv.dorsal || '?'}`
                  const posInfo = POSICIONES[pos as keyof typeof POSICIONES]
                  const bgColor = posInfo?.color || '#ffffff'

                  return (
                    <div
                      key={conv.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                      style={{ top: coords.top, left: coords.left }}
                    >
                      <div
                        className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center shadow-md text-white"
                        style={{ backgroundColor: bgColor }}
                      >
                        {conv.dorsal || player?.dorsal || '?'}
                      </div>
                      <span className="block text-[10px] text-white font-medium mt-0.5 max-w-[70px] truncate drop-shadow">
                        {displayName}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bench + squad info */}
        <div className="space-y-4">
          {/* Suplentes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                Suplentes ({suplentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suplentes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Sin suplentes en convocatoria</p>
              ) : (
                <div className="space-y-1.5">
                  {suplentes.map((conv) => {
                    const player = getPlayerData(conv)
                    const pos = conv.posicion_asignada || player?.posicion_principal || ''
                    const posColor = getPositionColor(pos)
                    return (
                      <div key={conv.id} className="flex items-center gap-3 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {conv.dorsal || player?.dorsal || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {player?.apodo || `${player?.nombre || ''} ${player?.apellidos || ''}`.trim() || 'Jugador'}
                          </p>
                        </div>
                        <Badge className={`text-[10px] border-0 shrink-0 ${posColor}`}>
                          {pos || '—'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          {convocatoria.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{convocatoria.length}</p>
                    <p className="text-xs text-muted-foreground">Convocados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{titulares.length}</p>
                    <p className="text-xs text-muted-foreground">Titulares</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{suplentes.length}</p>
                    <p className="text-xs text-muted-foreground">Suplentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Plan sections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Plan táctico
        </h2>

        {PLAN_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${section.color}`} />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={plan[section.key]}
                  onChange={(e) => handlePlanChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save button (bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar plan
          </Button>
        </div>
      )}
    </div>
  )
}
