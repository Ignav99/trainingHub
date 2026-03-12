'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { X, Save, Download, Plus, Trash2, Loader2, Flag, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import {
  Partido, Jugador, ABPJugada, ABPPartidoJugada, ABPAsignacion,
  ABP_TIPOS, ABP_ROLES, LadoABP,
} from '@/types'
import { TEAM_COLORS, ELEMENT_SIZES } from '@/components/tarea-editor/types'
import ABPPitch from './ABPPitch'

interface ABPPreparePlanProps {
  onClose: () => void
}

interface PlanJugada {
  jugada_id: string
  jugada: ABPJugada
  asignaciones_override: ABPAsignacion[]
  notas: string
  orden: number
}

function MiniDiagram({ jugada }: { jugada: ABPJugada }) {
  const fase = jugada.fases?.[0]
  const elements = fase?.diagram?.elements || []
  const arrows = fase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div className="w-14 h-10 flex-shrink-0 rounded overflow-hidden border border-gray-200">
      <ABPPitch type={pitchView as 'full' | 'half'}>
        {arrows.map((arrow: any) => (
          <line key={arrow.id} x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
            stroke={arrow.color || '#FFF'} strokeWidth="3" strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'} />
        ))}
        {elements.map((el: any) => {
          if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
            return (
              <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                <circle r={10} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
              </g>
            )
          }
          if (el.type === 'ball') return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="6" fill="#FFF" stroke="#000" strokeWidth="1" />
          return null
        })}
      </ABPPitch>
    </div>
  )
}

export default function ABPPreparePlan({ onClose }: ABPPreparePlanProps) {
  const { equipoActivo } = useEquipoStore()
  const equipoId = equipoActivo?.id

  // State
  const [selectedPartidoId, setSelectedPartidoId] = useState<string>('')
  const [comentarioOfensivo, setComentarioOfensivo] = useState('')
  const [comentarioDefensivo, setComentarioDefensivo] = useState('')
  const [planJugadas, setPlanJugadas] = useState<PlanJugada[]>([])
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerFilter, setPickerFilter] = useState<LadoABP | 'todo'>('todo')
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Fetch upcoming partidos
  const partidosKey = apiKey('/partidos', { equipo_id: equipoId, limit: '50' }, ['equipo_id'])
  const { data: partidosData } = useSWR<{ data: Partido[] }>(partidosKey, apiFetcher)
  const partidos = (partidosData?.data || []).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Fetch jugadores
  const jugadoresKey = apiKey('/jugadores', { equipo_id: equipoId, limit: '100', activo: 'true' }, ['equipo_id'])
  const { data: jugadoresData } = useSWR<{ data: Jugador[] }>(jugadoresKey, apiFetcher)
  const jugadores = jugadoresData?.data || []

  // Fetch library
  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData } = useSWR<{ data: ABPJugada[] }>(showPicker ? libraryKey : null, apiFetcher)
  const library = libraryData?.data || []

  // Selected partido info
  const selectedPartido = partidos.find(p => p.id === selectedPartidoId)

  // Load plan when partido changes
  useEffect(() => {
    if (!selectedPartidoId) return
    setLoadingPlan(true)
    abpApi.getPlan(selectedPartidoId)
      .then(result => {
        const plan = result.plan
        if (plan) {
          setComentarioOfensivo(plan.comentario_ofensivo || '')
          setComentarioDefensivo(plan.comentario_defensivo || '')
        } else {
          setComentarioOfensivo('')
          setComentarioDefensivo('')
        }
        // Map jugadas
        const mapped: PlanJugada[] = (result.jugadas || [])
          .filter((j: ABPPartidoJugada) => j.jugada)
          .map((j: ABPPartidoJugada) => ({
            jugada_id: j.jugada_id,
            jugada: j.jugada!,
            asignaciones_override: j.asignaciones_override || j.jugada!.asignaciones || [],
            notas: j.notas || '',
            orden: j.orden,
          }))
        setPlanJugadas(mapped)
      })
      .catch(e => {
        console.error('Error loading plan:', e)
        setComentarioOfensivo('')
        setComentarioDefensivo('')
        setPlanJugadas([])
      })
      .finally(() => setLoadingPlan(false))
  }, [selectedPartidoId])

  // Add jugada from picker
  const handleAddJugada = (jugada: ABPJugada) => {
    if (planJugadas.some(pj => pj.jugada_id === jugada.id)) return
    setPlanJugadas(prev => [...prev, {
      jugada_id: jugada.id,
      jugada,
      asignaciones_override: jugada.asignaciones || [],
      notas: '',
      orden: prev.length,
    }])
    setShowPicker(false)
  }

  // Remove jugada
  const handleRemoveJugada = (jugadaId: string) => {
    setPlanJugadas(prev => prev.filter(pj => pj.jugada_id !== jugadaId).map((pj, i) => ({ ...pj, orden: i })))
  }

  // Update asignacion
  const updateAsignacion = (jugadaId: string, elementId: string, field: 'jugador_id' | 'rol', value: string) => {
    setPlanJugadas(prev => prev.map(pj => {
      if (pj.jugada_id !== jugadaId) return pj
      const existing = pj.asignaciones_override.find(a => a.element_id === elementId)
      let newAsigs: ABPAsignacion[]
      if (existing) {
        newAsigs = pj.asignaciones_override.map(a =>
          a.element_id === elementId ? { ...a, [field]: value || undefined } : a
        )
      } else {
        newAsigs = [...pj.asignaciones_override, { element_id: elementId, [field]: value || undefined }]
      }
      return { ...pj, asignaciones_override: newAsigs }
    }))
  }

  // Save
  const handleSave = async () => {
    if (!selectedPartidoId) return
    setSaving(true)
    try {
      await abpApi.savePlan(selectedPartidoId, {
        comentario_ofensivo: comentarioOfensivo || undefined,
        comentario_defensivo: comentarioDefensivo || undefined,
        jugadas: planJugadas.map((pj, i) => ({
          jugada_id: pj.jugada_id,
          asignaciones_override: pj.asignaciones_override.filter(a => a.jugador_id || a.rol),
          notas: pj.notas || undefined,
          orden: i,
        })),
      })
      toast.success('Plan ABP guardado')
    } catch (e) {
      console.error('Error saving plan:', e)
      toast.error('Error al guardar el plan')
    } finally {
      setSaving(false)
    }
  }

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!selectedPartidoId) return
    try {
      const blob = await abpApi.downloadPartidoPdf(selectedPartidoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `abp_plan_${selectedPartido?.rival?.nombre || 'partido'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error downloading PDF:', e)
      toast.error('Error al descargar PDF')
    }
  }

  // Split by lado
  const ofensivas = planJugadas.filter(pj => pj.jugada.lado === 'ofensivo')
  const defensivas = planJugadas.filter(pj => pj.jugada.lado === 'defensivo')

  // Available for picker
  const assignedIds = new Set(planJugadas.map(pj => pj.jugada_id))
  const available = library
    .filter(j => !assignedIds.has(j.id))
    .filter(j => pickerFilter === 'todo' || j.lado === pickerFilter)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Flag className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Preparar ABP Partido</h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedPartidoId && planJugadas.length > 0 && (
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!selectedPartidoId || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Partido selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Partido</label>
            <select
              value={selectedPartidoId}
              onChange={e => setSelectedPartidoId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar partido...</option>
              {partidos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fecha} — vs {p.rival?.nombre || 'Rival'} ({p.localia === 'local' ? 'Casa' : p.localia === 'visitante' ? 'Fuera' : p.localia})
                  {p.competicion ? ` · ${p.competicion}` : ''}
                  {p.jornada ? ` · J${p.jornada}` : ''}
                </option>
              ))}
            </select>
            {selectedPartido && (
              <p className="mt-1.5 text-xs text-gray-500">
                vs <strong>{selectedPartido.rival?.nombre}</strong> · {selectedPartido.fecha}
                {selectedPartido.hora ? ` · ${selectedPartido.hora}` : ''}
              </p>
            )}
          </div>

          {!selectedPartidoId && (
            <div className="text-center py-16 text-gray-400">
              <Flag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Selecciona un partido para preparar el plan ABP</p>
            </div>
          )}

          {selectedPartidoId && loadingPlan && (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-gray-400 mt-2">Cargando plan...</p>
            </div>
          )}

          {selectedPartidoId && !loadingPlan && (
            <>
              {/* Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-700 mb-1.5">
                    Comentario Ofensivo
                  </label>
                  <textarea
                    value={comentarioOfensivo}
                    onChange={e => setComentarioOfensivo(e.target.value)}
                    rows={4}
                    placeholder="Indicaciones para las jugadas ofensivas del equipo..."
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-red-700 mb-1.5">
                    Comentario Defensivo
                  </label>
                  <textarea
                    value={comentarioDefensivo}
                    onChange={e => setComentarioDefensivo(e.target.value)}
                    rows={4}
                    placeholder="Indicaciones para defender las ABP del rival..."
                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-red-50/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  />
                </div>
              </div>

              {/* Ofensivas section */}
              <JugadaSection
                title="Jugadas Ofensivas"
                lado="ofensivo"
                jugadas={ofensivas}
                allJugadores={jugadores}
                onRemove={handleRemoveJugada}
                onUpdateAsignacion={updateAsignacion}
                onAddClick={() => { setPickerFilter('ofensivo'); setShowPicker(true) }}
                color="blue"
              />

              {/* Defensivas section */}
              <JugadaSection
                title="Jugadas Defensivas"
                lado="defensivo"
                jugadas={defensivas}
                allJugadores={jugadores}
                onRemove={handleRemoveJugada}
                onUpdateAsignacion={updateAsignacion}
                onAddClick={() => { setPickerFilter('defensivo'); setShowPicker(true) }}
                color="red"
              />
            </>
          )}
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[75vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold mb-2">Seleccionar jugada</h3>
              <div className="flex gap-1">
                {(['todo', 'ofensivo', 'defensivo'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPickerFilter(f)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      pickerFilter === f
                        ? f === 'ofensivo' ? 'bg-blue-500 text-white'
                          : f === 'defensivo' ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'todo' ? 'Todas' : f === 'ofensivo' ? 'Ofensivas' : 'Defensivas'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-3 space-y-1.5">
              {available.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {library.length === 0 ? 'No hay jugadas en la biblioteca' : 'No hay jugadas disponibles'}
                </div>
              ) : (
                available.map(j => {
                  const tipoInfo = ABP_TIPOS.find(t => t.value === j.tipo)
                  const hasElements = (j.fases?.[0]?.diagram?.elements?.length || 0) > 0
                  return (
                    <button
                      key={j.id}
                      onClick={() => handleAddJugada(j)}
                      className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-orange-50 text-left transition-colors"
                    >
                      {hasElements && <MiniDiagram jugada={j} />}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                        j.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {j.lado === 'ofensivo' ? 'OF' : 'DF'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{j.nombre}</div>
                        <span className="text-xs text-gray-400">{tipoInfo?.label}</span>
                      </div>
                      {j.codigo && <span className="text-[10px] font-mono text-gray-400">{j.codigo}</span>}
                    </button>
                  )
                })
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <button onClick={() => setShowPicker(false)} className="w-full py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Jugada Section ============

interface JugadaSectionProps {
  title: string
  lado: LadoABP
  jugadas: PlanJugada[]
  allJugadores: Jugador[]
  onRemove: (jugadaId: string) => void
  onUpdateAsignacion: (jugadaId: string, elementId: string, field: 'jugador_id' | 'rol', value: string) => void
  onAddClick: () => void
  color: 'blue' | 'red'
}

function JugadaSection({ title, jugadas, allJugadores, onRemove, onUpdateAsignacion, onAddClick, color }: JugadaSectionProps) {
  const borderColor = color === 'blue' ? 'border-blue-200' : 'border-red-200'
  const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-red-50'
  const textColor = color === 'blue' ? 'text-blue-700' : 'text-red-700'
  const btnBg = color === 'blue' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-red-50 text-red-600 hover:bg-red-100'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-bold ${textColor} uppercase tracking-wide`}>{title}</h2>
          <span className="text-xs text-gray-400">({jugadas.length})</span>
        </div>
        <button onClick={onAddClick} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${btnBg}`}>
          <Plus className="h-3 w-3" /> Agregar
        </button>
      </div>

      {jugadas.length === 0 ? (
        <div className={`text-center py-6 text-gray-400 text-sm border border-dashed ${borderColor} rounded-lg`}>
          No hay jugadas {color === 'blue' ? 'ofensivas' : 'defensivas'}
        </div>
      ) : (
        <div className="space-y-3">
          {jugadas.map(pj => (
            <PlanJugadaCard
              key={pj.jugada_id}
              planJugada={pj}
              jugadores={allJugadores}
              onRemove={() => onRemove(pj.jugada_id)}
              onUpdateAsignacion={(elementId, field, value) => onUpdateAsignacion(pj.jugada_id, elementId, field, value)}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Plan Jugada Card ============

interface PlanJugadaCardProps {
  planJugada: PlanJugada
  jugadores: Jugador[]
  onRemove: () => void
  onUpdateAsignacion: (elementId: string, field: 'jugador_id' | 'rol', value: string) => void
  color: 'blue' | 'red'
}

function PlanJugadaCard({ planJugada, jugadores, onRemove, onUpdateAsignacion, color }: PlanJugadaCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { jugada, asignaciones_override } = planJugada
  const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)

  // Get player/gk elements from first phase diagram
  const fase = jugada.fases?.[0]
  const allElements = fase?.diagram?.elements || []
  const allArrows = fase?.diagram?.arrows || []
  const elements = allElements.filter(
    (el: any) => el.type === 'player' || el.type === 'player_gk'
  )
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'
  const hasDiagram = allElements.length > 0

  const borderColor = color === 'blue' ? 'border-blue-100' : 'border-red-100'

  return (
    <div className={`border-2 ${borderColor} rounded-xl overflow-hidden bg-white`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <MiniDiagram jugada={jugada} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900 truncate">{jugada.nombre}</span>
            {jugada.codigo && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 rounded">{jugada.codigo}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{tipoInfo?.label || jugada.tipo}</span>
            {jugada.senal_codigo && <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px]">{jugada.senal_codigo}</span>}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <button onClick={e => { e.stopPropagation(); onRemove() }} className="p-1 text-gray-300 hover:text-red-500 rounded">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded: Diagram + Assignments side by side */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className={`mt-2.5 ${hasDiagram && elements.length > 0 ? 'flex gap-4' : ''}`}>
            {/* Diagram preview */}
            {hasDiagram && (
              <div className={`${elements.length > 0 ? 'w-56 flex-shrink-0' : 'w-full max-w-xs'} rounded-lg overflow-hidden border border-gray-200`}>
                <ABPPitch type={pitchView as 'full' | 'half'}>
                  {allArrows.map((arrow: any) => {
                    const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
                    return (
                      <g key={arrow.id}>
                        <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                          stroke={arrow.color || '#FFF'} strokeWidth="2.5" strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'} />
                        <polygon
                          points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 10 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 10 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle + Math.PI / 6)}`}
                          fill={arrow.color || '#FFF'} />
                        {arrow.label && (
                          <>
                            <circle cx={(arrow.from.x + arrow.to.x) / 2} cy={(arrow.from.y + arrow.to.y) / 2} r="10" fill="rgba(0,0,0,0.7)" />
                            <text x={(arrow.from.x + arrow.to.x) / 2} y={(arrow.from.y + arrow.to.y) / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="9" fontWeight="bold">{arrow.label}</text>
                          </>
                        )}
                      </g>
                    )
                  })}
                  {allElements.map((el: any) => {
                    if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
                      return (
                        <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                          <circle r={12} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
                          <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="10" fontWeight="bold" fontFamily="Arial">{el.label}</text>
                        </g>
                      )
                    }
                    if (el.type === 'ball') return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="6" fill="#FFF" stroke="#000" strokeWidth="1" />
                    if (el.type === 'cone') return <polygon key={el.id} points={`${el.position.x},${el.position.y - 8} ${el.position.x + 6},${el.position.y + 6} ${el.position.x - 6},${el.position.y + 6}`} fill="#FF6B00" />
                    return null
                  })}
                </ABPPitch>
              </div>
            )}

            {/* Assignments */}
            {elements.length > 0 && (
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asignaciones</label>
                <div className="space-y-1.5">
                  {elements.map((el: any) => {
                    const asig: ABPAsignacion = asignaciones_override.find(a => a.element_id === el.id) || { element_id: el.id }
                    return (
                      <div key={el.id} className="flex items-center gap-1.5">
                        {/* Element badge */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: el.color || TEAM_COLORS.team1 }}
                        >
                          {el.label}
                        </div>
                        {/* Player select */}
                        <select
                          value={asig.jugador_id || ''}
                          onChange={e => onUpdateAsignacion(el.id, 'jugador_id', e.target.value)}
                          className="flex-1 px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white min-w-0"
                        >
                          <option value="">Sin asignar</option>
                          {jugadores.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos || ''}
                            </option>
                          ))}
                        </select>
                        {/* Role select */}
                        <select
                          value={asig.rol || ''}
                          onChange={e => onUpdateAsignacion(el.id, 'rol', e.target.value)}
                          className="w-28 px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white flex-shrink-0"
                        >
                          <option value="">Rol</option>
                          {ABP_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
